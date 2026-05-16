"""
Trash Detector — floating_trash detection and density estimation.

# TODO: Load the trained EfficientNet-B0 head for `floating_trash`.
# TODO: Optionally add segmentation or bounding box model in v2.
"""

from typing import Dict, Any


def detect_floating_trash(image_path: str) -> Dict[str, Any]:
    """
    # TODO: Run trash classification head.
    # TODO: Use threshold from config (0.85 for trash).
    """
    return {
        "floating_trash": True,
        "confidence": 0.92,
        "note": "# TODO: Wire real EfficientNet-B0 trash head.",
    }
