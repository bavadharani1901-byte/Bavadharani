"""
GEE Client — Google Earth Engine authentication and Sentinel-2 image fetching.

# TODO: Implement GEE auth flow (service account or OAuth).
# TODO: Build `fetch_sentinel2_for_zone(zone_id, lat, lng, radius_km, date_range)`.
# TODO: Return a COG / asset ID that downstream calculators can consume.
"""

from typing import Dict, Any

# TODO: Replace with real earthengine-api once environment is set up.
# import ee


def authenticate():
    """# TODO: Initialize GEE with service account credentials."""
    pass


def fetch_sentinel2_for_zone(
    zone_id: str,
    lat: float,
    lng: float,
    radius_km: float,
    date_range: tuple[str, str] = ("2026-04-01", "2026-05-15"),
) -> Dict[str, Any]:
    """
    # TODO: Query Sentinel-2 L2A collection for the geometry buffer.
    # TODO: Cloud-mask using SCL band, compute median composite.
    # TODO: Return dict with:
    #   { image_id, asset_uri, crs, resolution, geometry, captured_at }
    """
    return {
        "status": "mock",
        "zone_id": zone_id,
        "image_id": f"COPERNICUS/S2_SR_HARMONIZED_{zone_id}",
        "asset_uri": None,
        "captured_at": "2026-05-15T00:00:00Z",
        "note": "# TODO: GEE pipeline not yet wired. Returning dummy metadata.",
    }
