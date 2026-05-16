"""
Turbidity Scorer — turbid_water detection + water color estimation.

# TODO: Load the trained EfficientNet-B0 head for `turbid_water`.
# TODO: Derive water_color from image processing (HSV crop) as a fallback/explanation signal.
"""

from typing import Dict, Any
from PIL import Image
import numpy as np
from matplotlib.colors import rgb_to_hsv


def score_turbidity(image_path: str) -> Dict[str, Any]:
    """
    # TODO: Run turbidity classification head.
    # TODO: Use threshold from config (0.30 for turbid).
    # TODO: Heuristic upgrade to 'very_turbid' based on probability + color.
    """
    # Water color stub
    img = Image.open(image_path).convert("RGB").resize((256, 256))
    arr = np.asarray(img).astype(np.float32) / 255.0
    h, w, _ = arr.shape
    crop = arr[int(h * 0.30): int(h * 0.95), int(w * 0.10): int(w * 0.90), :]
    hsv = rgb_to_hsv(crop)
    sat = hsv[..., 1]
    val = hsv[..., 2]
    mean_s = float(sat.mean())
    mean_v = float(val.mean())

    water_color = "unknown"
    if mean_v > 0.60 and mean_s < 0.20:
        water_color = "clear"
    else:
        water_color = "brown"

    return {
        "turbid_water": True,
        "turbidity_level": "turbid",
        "water_color": water_color,
        "confidence": 0.78,
        "note": "# TODO: Wire real EfficientNet-B0 turbidity head.",
    }
