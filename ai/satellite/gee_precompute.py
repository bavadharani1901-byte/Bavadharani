from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, pstdev
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[2]
ZONES_PATH = REPO_ROOT / "data" / "seed_zones.json"
OUTPUT_PATH = REPO_ROOT / "data" / "seed_satellite_readings.json"
DB_PATH = REPO_ROOT / "data" / "db.json"


def anomaly_level_from_score(score: float) -> str:
    if score <= 0.30:
        return "low"
    if score <= 0.60:
        return "medium"
    if score <= 0.85:
        return "high"
    return "critical"


def quality_status_from_valid_pixels(valid_pixel_ratio: float) -> str:
    if valid_pixel_ratio >= 0.70:
        return "good"
    if valid_pixel_ratio >= 0.40:
        return "moderate"
    return "poor"


def confidence_score(
    valid_pixel_ratio: float,
    observation_count: int,
    recency_score: float,
) -> float:
    baseline_completeness = min(observation_count / 20, 1.0)
    score = 0.50 * valid_pixel_ratio + 0.30 * baseline_completeness + 0.20 * recency_score
    return round(max(0.0, min(1.0, score)), 3)


def build_anomaly_result(
    zone_id: str,
    latest: Dict[str, float | str],
    historical_values: List[float],
) -> Dict[str, Any]:
    clean_values = [v for v in historical_values if isinstance(v, (int, float)) and math.isfinite(v)]
    latest_value = float(latest["turbidity_proxy"])

    if len(clean_values) >= 2:
        historical_mean = mean(clean_values)
        historical_std = pstdev(clean_values) or 0.001
    else:
        historical_mean = latest_value
        historical_std = 0.001

    z_score = (latest_value - historical_mean) / historical_std
    anomaly_score = min(abs(z_score) / 3.0, 1.0)
    valid_pixel_ratio = float(latest.get("valid_pixel_ratio", 0.0))
    captured_at = str(latest["captured_at"])
    recency = recency_score(captured_at)
    confidence = confidence_score(valid_pixel_ratio, len(clean_values), recency)
    quality_status = quality_status_from_valid_pixels(valid_pixel_ratio)

    return {
        "zone_id": zone_id,
        "source": "sentinel_2_gee",
        "ndwi": round(float(latest["ndwi"]), 4),
        "mndwi": round(float(latest["mndwi"]), 4),
        "turbidity_proxy": round(latest_value, 4),
        "historical_mean": round(historical_mean, 4),
        "historical_std": round(historical_std, 4),
        "latest_value": round(latest_value, 4),
        "z_score": round(z_score, 3),
        "anomaly_score": round(anomaly_score, 3),
        "anomaly_level": anomaly_level_from_score(anomaly_score),
        "cloud_percentage": round(float(latest.get("cloud_percentage", 0.0)), 2),
        "valid_pixel_ratio": round(valid_pixel_ratio, 3),
        "quality_status": quality_status,
        "confidence": confidence,
        "captured_at": captured_at,
        "explanation": (
            f"Satellite turbidity proxy is {z_score:.1f} standard deviations "
            f"from this zone baseline."
        ),
    }


def recency_score(captured_at: str) -> float:
    try:
        captured = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
    except ValueError:
        return 0.5

    age_days = max(0, (datetime.now(timezone.utc) - captured).days)
    return max(0.0, min(1.0, 1.0 - age_days / 90.0))


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def sync_db_json(readings: List[Dict[str, Any]], db_path: Path = DB_PATH) -> None:
    if not db_path.exists():
        return

    db = read_json(db_path)
    observations = []
    anomalies = []

    for idx, reading in enumerate(readings):
        obs_id = f"sat_obs_{idx}"
        observations.append({
            "id": obs_id,
            "zone_id": reading["zone_id"],
            "source": reading["source"],
            "ndwi": reading["ndwi"],
            "mndwi": reading["mndwi"],
            "turbidity_proxy": reading["turbidity_proxy"],
            "historical_mean": reading["historical_mean"],
            "historical_std": reading["historical_std"],
            "latest_value": reading["latest_value"],
            "cloud_percentage": reading["cloud_percentage"],
            "valid_pixel_ratio": reading["valid_pixel_ratio"],
            "quality_status": reading["quality_status"],
            "confidence": reading["confidence"],
            "captured_at": reading["captured_at"],
        })
        anomalies.append({
            "id": f"sat_anom_{idx}",
            "zone_id": reading["zone_id"],
            "observation_id": obs_id,
            "z_score": reading["z_score"],
            "anomaly_score": reading["anomaly_score"],
            "anomaly_level": reading["anomaly_level"],
            "confidence": reading["confidence"],
            "historical_mean": reading["historical_mean"],
            "historical_std": reading["historical_std"],
            "latest_value": reading["latest_value"],
            "explanation": reading["explanation"],
            "created_at": reading["captured_at"],
        })

    db["satellite_observations"] = observations
    db["satellite_anomalies"] = anomalies
    write_json(db_path, db)


def initialize_ee(project: Optional[str] = None):
    try:
        import ee
    except Exception as exc:
        raise RuntimeError("earthengine-api not installed. Run: python -m pip install -r requirements.txt") from exc

    if project:
        ee.Initialize(project=project)
    else:
        ee.Initialize()
    return ee


def image_stats_for_zone(
    ee,
    image,
    area,
    scale: int,
) -> Optional[Dict[str, float | str]]:
    ndwi = image.normalizedDifference(["B3", "B8"]).rename("ndwi")
    mndwi = image.normalizedDifference(["B3", "B11"]).rename("mndwi")
    turbidity = image.normalizedDifference(["B4", "B3"]).rename("turbidity_proxy")
    valid_mask = image.select("B3").mask().rename("valid_pixel_ratio")

    composite = ndwi.addBands([mndwi, turbidity, valid_mask])
    reducer = ee.Reducer.mean()
    stats = composite.reduceRegion(
        reducer=reducer,
        geometry=area,
        scale=scale,
        maxPixels=1_000_000,
        bestEffort=True,
    ).getInfo()

    required = ["ndwi", "mndwi", "turbidity_proxy"]
    if any(stats.get(key) is None for key in required):
        return None

    captured_at = image.date().format("YYYY-MM-dd'T'HH:mm:ss'Z'").getInfo()
    cloud_percentage = image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo() or 0.0
    valid_pixel_ratio = stats.get("valid_pixel_ratio")

    return {
        "ndwi": float(stats["ndwi"]),
        "mndwi": float(stats["mndwi"]),
        "turbidity_proxy": float(stats["turbidity_proxy"]),
        "cloud_percentage": float(cloud_percentage),
        "valid_pixel_ratio": float(valid_pixel_ratio if valid_pixel_ratio is not None else 1.0),
        "captured_at": captured_at,
    }


def fetch_zone_observations(
    ee,
    zone: Dict[str, Any],
    start_date: str,
    end_date: str,
    max_cloud: float,
    scale: int,
    limit: int,
) -> List[Dict[str, float | str]]:
    point = ee.Geometry.Point([float(zone["lng"]), float(zone["lat"])])
    area = point.buffer(float(zone.get("radius_km", 2.0)) * 1000)

    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(area)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud))
        .sort("system:time_start", False)
        .limit(limit)
    )

    images = collection.toList(limit)
    count = int(collection.size().getInfo())
    observations: List[Dict[str, float | str]] = []

    for idx in range(count):
        image = ee.Image(images.get(idx))
        stats = image_stats_for_zone(ee, image, area, scale)
        if stats:
            observations.append(stats)

    return observations


def precompute(
    zones_path: Path = ZONES_PATH,
    output_path: Path = OUTPUT_PATH,
    project: Optional[str] = None,
    days: int = 365,
    max_cloud: float = 35.0,
    scale: int = 20,
    limit: int = 24,
    max_zones: Optional[int] = None,
) -> List[Dict[str, Any]]:
    ee = initialize_ee(project)
    zones = read_json(zones_path)
    if max_zones:
        zones = zones[:max_zones]

    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days)
    start_date = start_dt.date().isoformat()
    end_date = end_dt.date().isoformat()

    results: List[Dict[str, Any]] = []
    for zone in zones:
        print(f"Processing {zone['zone_id']}...")
        observations = fetch_zone_observations(
            ee=ee,
            zone=zone,
            start_date=start_date,
            end_date=end_date,
            max_cloud=max_cloud,
            scale=scale,
            limit=limit,
        )

        if not observations:
            print(f"  no valid observations, skipping")
            continue

        latest = observations[0]
        historical_values = [float(obs["turbidity_proxy"]) for obs in observations[1:]]
        if len(historical_values) < 2:
            historical_values = [float(obs["turbidity_proxy"]) for obs in observations]

        result = build_anomaly_result(zone["zone_id"], latest, historical_values)
        results.append(result)
        print(
            f"  z={result['z_score']} anomaly={result['anomaly_score']} "
            f"level={result['anomaly_level']} confidence={result['confidence']}"
        )

    if not results:
        raise RuntimeError("No satellite results produced; keeping existing seed file unchanged.")

    write_json(output_path, results)
    if output_path.resolve() == OUTPUT_PATH.resolve():
        sync_db_json(results)
    print(f"Saved {len(results)} satellite readings to {output_path}")
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute WAVE Sentinel-2 satellite anomalies.")
    parser.add_argument("--project", default=None, help="Google Cloud project id for Earth Engine")
    parser.add_argument("--zones", default=str(ZONES_PATH), help="Path to seed_zones.json")
    parser.add_argument("--out", default=str(OUTPUT_PATH), help="Output seed_satellite_readings.json")
    parser.add_argument("--days", type=int, default=365)
    parser.add_argument("--max-cloud", type=float, default=35.0)
    parser.add_argument("--scale", type=int, default=20)
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument("--max-zones", type=int, default=None)
    args = parser.parse_args()

    precompute(
        zones_path=Path(args.zones),
        output_path=Path(args.out),
        project=args.project,
        days=args.days,
        max_cloud=args.max_cloud,
        scale=args.scale,
        limit=args.limit,
        max_zones=args.max_zones,
    )


if __name__ == "__main__":
    main()
