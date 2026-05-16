"""
Quality Checker — Blur, darkness, resolution, overexposure detection.

# TODO: Implement Laplacian variance for blur (avoid cv2 if possible; use PIL/scipy).
# TODO: Check min resolution (640x480).
# TODO: Detect overexposure by bright pixel ratio.
"""

from typing import Dict, Any
from PIL import Image
import numpy as np


def check_image_quality(image_path: str) -> Dict[str, Any]:
    """
    # TODO: Open image, compute mean brightness, std, Laplacian variance.
    # TODO: Return quality_score (0–1) and quality_issues list.
    """
    # Minimal stub using PIL + numpy (no cv2)
    try:
        img = Image.open(image_path).convert("RGB")
        w, h = img.size
    except Exception:
        return {"quality_score": 0.0, "quality_issues": ["invalid_image"], "image_quality": "poor"}

    arr = np.asarray(img).astype(np.float32) / 255.0
    gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])

    issues = []
    score = 1.0

    if w < 640 or h < 480:
        issues.append("low_resolution")
        score -= 0.25

    mean_brightness = float(gray.mean())
    if mean_brightness < 0.18:
        issues.append("too_dark")
        score -= 0.25
    if mean_brightness > 0.88:
        issues.append("too_bright")
        score -= 0.25

    color_std = float(arr.std())
    if color_std < 0.035:
        issues.append("blank_or_blocked")
        score -= 0.50

    score = max(0.0, min(1.0, score))

    if score >= 0.75:
        label = "good"
    elif score >= 0.50:
        label = "acceptable"
    else:
        label = "poor"

    return {
        "image_quality": label,
        "quality_score": round(score, 3),
        "quality_issues": issues,
        "note": "# TODO: Add Laplacian blur check and overexposure ratio.",
    }
