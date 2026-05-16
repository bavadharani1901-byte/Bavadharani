"""
Index Calculator — NDWI, MNDWI, and turbidity proxy from Sentinel-2 bands.

# TODO: Accept a GEE Image or local numpy array from `gee_client.py`.
# TODO: Compute NDWI = (B3 - B8) / (B3 + B8).
# TODO: Compute MNDWI = (B3 - B11) / (B3 + B11).
# TODO: Compute turbidity proxy from B4 / B2 ratio or Sentinel-2 BOA reflectance.
"""

from typing import Dict, Any

# TODO: import numpy as np
# TODO: import ee


def calculate_indices(image_asset: Dict[str, Any]) -> Dict[str, Any]:
    """
    # TODO: Read B2, B3, B4, B8, B11, B12 from the asset.
    # TODO: Apply scaling factors (1e-4 for Sentinel-2 BOA).
    # TODO: Return a dict with per-pixel or mean zone values.
    """
    return {
        "status": "mock",
        "ndwi": 0.21,
        "mndwi": 0.18,
        "turbidity_proxy": 0.78,
        "chlorophyll_proxy": 0.45,
        "note": "# TODO: Real GEE band math not wired. Returning seed-level dummy values.",
    }
