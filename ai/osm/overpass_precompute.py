from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

REPO_ROOT = Path(__file__).resolve().parents[2]
ZONES_PATH = REPO_ROOT / "data" / "seed_zones.json"
OUTPUT_PATH = REPO_ROOT / "data" / "seed_osm_sources.json"
DB_PATH = REPO_ROOT / "data" / "db.json"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

SOURCE_WEIGHTS = {
    "wastewater": 1.00,
    "industrial": 0.90,
    "landfill": 0.85,
    "drainage": 0.70,
    "agricultural": 0.60,
    "domestic": 0.50,
    "unknown": 0.25,
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def classify_source(tags: Dict[str, str]) -> str:
    landuse = tags.get("landuse", "")
    man_made = tags.get("man_made", "")
    amenity = tags.get("amenity", "")
    waterway = tags.get("waterway", "")
    industrial = tags.get("industrial", "")

    if man_made == "wastewater_plant" or "wastewater" in industrial:
        return "wastewater"
    if landuse == "industrial" or man_made == "works" or industrial:
        return "industrial"
    if landuse == "landfill" or amenity in {"waste_disposal", "recycling"}:
        return "landfill"
    if waterway in {"drain", "ditch", "canal"}:
        return "drainage"
    if landuse in {"farmland", "farmyard", "orchard", "plantation", "aquaculture"}:
        return "agricultural"
    if landuse == "residential":
        return "domestic"
    return "unknown"


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def distance_decay(distance_km: float) -> float:
    return 1 / (1 + max(distance_km, 0.0))


def source_contribution(source_type: str, distance_km: float, feature_confidence: float = 0.8) -> float:
    source_weight = SOURCE_WEIGHTS.get(source_type, SOURCE_WEIGHTS["unknown"])
    upstream_weight = 0.5
    score = source_weight * distance_decay(distance_km) * upstream_weight * feature_confidence
    return round(max(0.0, min(1.0, score)), 3)


def source_name(tags: Dict[str, str], source_type: str, osm_id: int | str) -> str:
    return (
        tags.get("name")
        or tags.get("operator")
        or tags.get("industrial")
        or tags.get("landuse")
        or tags.get("man_made")
        or tags.get("amenity")
        or tags.get("waterway")
        or f"{source_type.title()} source {osm_id}"
    )


def build_overpass_query(lat: float, lng: float, radius_m: int) -> str:
    filters = [
        '["landuse"~"industrial|landfill|farmland|farmyard|residential|orchard|plantation|aquaculture"]',
        '["man_made"~"wastewater_plant|works"]',
        '["amenity"~"waste_disposal|recycling"]',
        '["waterway"~"drain|ditch|canal"]',
        '["industrial"]',
    ]
    selectors = []
    for osm_type in ("node", "way", "relation"):
        for flt in filters:
            selectors.append(f"  {osm_type}(around:{radius_m},{lat},{lng}){flt};")

    return "\n".join([
        "[out:json][timeout:45];",
        "(",
        *selectors,
        ");",
        "out center tags;",
    ])


def fetch_overpass(zone: Dict[str, Any], timeout: int = 60) -> List[Dict[str, Any]]:
    lat = float(zone["lat"])
    lng = float(zone["lng"])
    radius_m = int((float(zone.get("radius_km", 2.0)) + 3.0) * 1000)
    query = build_overpass_query(lat, lng, radius_m)
    response = requests.post(OVERPASS_URL, data={"data": query}, timeout=timeout)
    response.raise_for_status()
    return response.json().get("elements", [])


def element_to_source(zone: Dict[str, Any], element: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tags = element.get("tags") or {}
    source_type = classify_source(tags)
    if source_type == "unknown":
        return None

    center = element.get("center") or {}
    lat = element.get("lat", center.get("lat"))
    lng = element.get("lon", center.get("lon"))
    if lat is None or lng is None:
        return None

    distance = haversine_km(float(zone["lat"]), float(zone["lng"]), float(lat), float(lng))
    contribution = source_contribution(source_type, distance)

    return {
        "name": source_name(tags, source_type, element.get("id", "unknown")),
        "type": source_type,
        "distance_km": round(distance, 3),
        "position_context": "unknown",
        "risk_contribution": contribution,
        "osm_id": f"{element.get('type', 'osm')}_{element.get('id', 'unknown')}",
    }


def aggregate_sources(zone_id: str, nearby_sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    sources = sorted(nearby_sources, key=lambda item: item["risk_contribution"], reverse=True)
    total = sum(float(src["risk_contribution"]) for src in sources)
    attribution: Dict[str, float] = {}
    for src in sources:
        attribution[src["type"]] = attribution.get(src["type"], 0.0) + float(src["risk_contribution"])

    if total > 0:
        attribution = {key: round(value / total, 2) for key, value in attribution.items()}

    dominant = max(attribution.items(), key=lambda item: item[1])[0] if attribution else "unknown"
    top = sources[0] if sources else None
    explanation = (
        f"Likely {dominant} source risk from {len(sources)} OSM feature(s) near this zone."
        if top is None
        else f"Likely {dominant} source risk; top contributor is {top['name']} at {top['distance_km']} km."
    )

    return {
        "zone_id": zone_id,
        "source_risk_score": round(min(total, 1.0), 2),
        "dominant_source_type": dominant,
        "source_attribution": attribution,
        "nearby_sources": sources[:10],
        "confidence": 0.7 if sources else 0.0,
        "explanation": explanation,
    }


def sync_db_json(enrichments: List[Dict[str, Any]], db_path: Path = DB_PATH) -> None:
    if not db_path.exists():
        return

    db = read_json(db_path)
    sources = []
    for zone_idx, enrichment in enumerate(enrichments):
        for src_idx, src in enumerate(enrichment["nearby_sources"]):
            sources.append({
                "id": f"osm_{zone_idx}_{src_idx}",
                "zone_id": enrichment["zone_id"],
                "source_type": src["type"],
                "name": src["name"],
                "distance_km": src["distance_km"],
                "position_context": src["position_context"],
                "risk_contribution": src["risk_contribution"],
                "osm_id": src.get("osm_id", f"osm_{zone_idx}_{src_idx}"),
            })

    db["osm_sources"] = sources
    write_json(db_path, db)


def precompute(
    zones_path: Path = ZONES_PATH,
    output_path: Path = OUTPUT_PATH,
    max_zones: Optional[int] = None,
) -> List[Dict[str, Any]]:
    zones = read_json(zones_path)
    if max_zones:
        zones = zones[:max_zones]
    existing_by_zone = {}
    if output_path.exists():
      try:
          existing_by_zone = {item["zone_id"]: item for item in read_json(output_path)}
      except Exception:
          existing_by_zone = {}

    enrichments = []
    for zone in zones:
        print(f"Processing {zone['zone_id']}...")
        try:
            elements = fetch_overpass(zone)
            nearby = [
                source
                for element in elements
                if (source := element_to_source(zone, element)) is not None
            ]
        except Exception as exc:
            print(f"  overpass failed: {exc}")
            existing = existing_by_zone.get(zone["zone_id"])
            if existing:
                enrichments.append(existing)
                print("  using existing cached enrichment")
                continue
            nearby = []

        result = aggregate_sources(zone["zone_id"], nearby)
        enrichments.append(result)
        print(
            f"  sources={len(result['nearby_sources'])} "
            f"score={result['source_risk_score']} dominant={result['dominant_source_type']}"
        )

    if not enrichments:
        raise RuntimeError("No OSM enrichment results produced.")

    write_json(output_path, enrichments)
    if output_path.resolve() == OUTPUT_PATH.resolve():
        sync_db_json(enrichments)
    print(f"Saved {len(enrichments)} OSM enrichments to {output_path}")
    return enrichments


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute WAVE OSM source attribution.")
    parser.add_argument("--zones", default=str(ZONES_PATH))
    parser.add_argument("--out", default=str(OUTPUT_PATH))
    parser.add_argument("--max-zones", type=int, default=None)
    args = parser.parse_args()

    precompute(
        zones_path=Path(args.zones),
        output_path=Path(args.out),
        max_zones=args.max_zones,
    )


if __name__ == "__main__":
    main()
