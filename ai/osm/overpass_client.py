"""
Overpass Client — Query OpenStreetMap via Overpass API for pollution sources.

# TODO: Build Overpass QL queries for industrial, domestic, agricultural sources.
# TODO: Query types: industrial_area, landfill, wastewater_plant, factory, farm.
# TODO: Cache results per zone to avoid repeated API calls.
"""

from typing import Dict, Any, List

# TODO: import requests


def fetch_sources_for_zone(
    zone_id: str,
    lat: float,
    lng: float,
    radius_km: float = 5.0,
) -> List[Dict[str, Any]]:
    """
    # TODO: Convert radius_km to meters and build Overpass QL.
    # TODO: Parse JSON elements into a normalized source list.
    """
    return [
        {
            "name": "Binh Duong Industrial Zone",
            "type": "industrial_area",
            "distance_km": 0.7,
            "position_context": "upstream",
            "osm_id": "way/123456789",
            "tags": {"landuse": "industrial"},
            "note": "# TODO: Replace with real Overpass API response.",
        }
    ]
