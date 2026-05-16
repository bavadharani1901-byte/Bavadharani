"""
Distance Scorer — Distance decay + upstream weighting for OSM sources.

# TODO: Compute haversine distance from zone center to each source lat/lng.
# TODO: Use river flow direction / DEM to determine upstream vs downstream.
# TODO: Apply exponential distance decay: risk_contribution = base_risk * exp(-distance_km / 2.0).
# TODO: Upstream sources get a 1.5x multiplier; downstream get 0.5x.
"""

import math
from typing import Dict, Any


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """# TODO: Replace with geopy or shapely for production accuracy."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def score_source(
    source: Dict[str, Any],
    zone_lat: float,
    zone_lng: float,
) -> Dict[str, Any]:
    """
    # TODO: Determine upstream vs downstream using DEM or river polyline.
    # TODO: Apply distance decay and context multipliers.
    """
    distance = source.get("distance_km", 1.0)
    decay = math.exp(-distance / 2.0)
    upstream_mult = 1.5 if source.get("position_context") == "upstream" else 0.5
    base_risk = 0.4

    risk_contribution = base_risk * decay * upstream_mult

    return {
        **source,
        "risk_contribution": round(risk_contribution, 3),
        "note": "# TODO: Replace with real DEM-based upstream detection.",
    }
