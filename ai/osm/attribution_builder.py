"""
Attribution Builder — Aggregate per-source scores into zone-level attribution.

# TODO: Normalize individual risk_contribution values to sum to 1.0.
# TODO: Group by source_type (industrial, domestic, agricultural).
# TODO: Compute overall source_risk_score and confidence.
"""

from typing import Dict, Any, List


def build_attribution(
    zone_id: str,
    scored_sources: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    # TODO: Aggregate by source_type.
    # TODO: Compute dominant_source_type and percentages.
    # TODO: Return full attribution payload for backend ingestion.
    """
    attribution = {"industrial": 0.0, "domestic": 0.0, "agricultural": 0.0}
    total = 0.0

    for s in scored_sources:
        t = s.get("source_type", "unknown")
        rc = s.get("risk_contribution", 0.0)
        if t in attribution:
            attribution[t] += rc
        total += rc

    if total > 0:
        for k in attribution:
            attribution[k] = round(attribution[k] / total, 2)

    dominant = max(attribution, key=attribution.get) if total > 0 else "unknown"
    source_risk_score = min(total, 1.0)

    return {
        "zone_id": zone_id,
        "source_risk_score": round(source_risk_score, 2),
        "dominant_source_type": dominant,
        "source_attribution": attribution,
        "nearby_sources": scored_sources,
        "confidence": 0.74,
        "explanation": f"{len(scored_sources)} source(s) found within river buffer zone.",
        "note": "# TODO: Replace with real Overpass + DEM pipeline.",
    }
