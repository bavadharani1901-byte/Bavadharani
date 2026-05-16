"""
Source Classifier — Classify OSM tags into industrial / domestic / agricultural.

# TODO: Build a tag-to-category mapping from OSM key-value pairs.
# TODO: Handle edge cases (mixed-use, factories with residential, etc.).
"""

from typing import Dict, Any


def classify_source(osm_tags: Dict[str, str]) -> str:
    """
    # TODO: Map tags to one of: industrial, domestic, agricultural, unknown.
    # TODO: Return confidence score based on tag specificity.
    """
    landuse = osm_tags.get("landuse", "")
    amenity = osm_tags.get("amenity", "")

    if landuse in {"industrial", "landfill", "quarry"}:
        return "industrial"
    if amenity in {"wastewater_plant", "sanitary_dump_station"}:
        return "domestic"
    if landuse in {"farm", "farmland", "aquaculture"}:
        return "agricultural"

    return "unknown"
