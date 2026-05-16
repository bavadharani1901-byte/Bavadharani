"""
Score Builder — Aggregates all sub-predictions into the final photo_ai_score.

# TODO: severity_score = 0.50*trash + 0.40*turbidity + 0.10*color
# TODO: photo_ai_score = severity_score * confidence * quality_score
# TODO: needs_review = not is_water_scene OR quality_score < 0.50 OR confidence < 0.60
"""

from typing import Dict, Any


def build_photo_ai_score(
    is_water_scene: bool,
    trash_result: Dict[str, Any],
    turbidity_result: Dict[str, Any],
    quality_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    # TODO: Calibrate severity_score based on actual model probabilities.
    # TODO: Gate all water-related outputs to zero when is_water_scene is False.
    """
    if not is_water_scene:
        return {
            "is_water_scene": False,
            "floating_trash": False,
            "turbid_water": False,
            "turbidity_level": "unknown",
            "water_color": "unknown",
            "severity_score": 0.0,
            "severity_level": "low",
            "confidence": 0.0,
            "photo_ai_score": 0.0,
            "needs_review": True,
            "note": "# TODO: Real gating logic.",
        }

    # Dummy aggregation
    severity_score = 0.55
    confidence = 0.80
    quality_score = quality_result.get("quality_score", 1.0)
    photo_ai_score = severity_score * confidence * quality_score

    level = "low"
    if severity_score > 0.75:
        level = "critical"
    elif severity_score > 0.50:
        level = "high"
    elif severity_score > 0.25:
        level = "moderate"

    return {
        "is_water_scene": True,
        "floating_trash": trash_result.get("floating_trash", False),
        "turbid_water": turbidity_result.get("turbid_water", False),
        "turbidity_level": turbidity_result.get("turbidity_level", "unknown"),
        "water_color": turbidity_result.get("water_color", "unknown"),
        "severity_score": round(severity_score, 3),
        "severity_level": level,
        "confidence": round(confidence, 3),
        "photo_ai_score": round(photo_ai_score, 3),
        "needs_review": quality_score < 0.50 or confidence < 0.60,
        "note": "# TODO: Aggregate real model probabilities.",
    }
