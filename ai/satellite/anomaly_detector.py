"""
Anomaly Detector — z-score and anomaly_score against a per-zone baseline.

# TODO: Maintain a rolling 90-day baseline per zone from satellite_observations table.
# TODO: Compute z_score = (current_turbidity - mean_baseline) / std_baseline.
# TODO: Map z_score → anomaly_score (0–1) and anomaly_level (low/medium/high/critical).
"""

from typing import Dict, Any


def compute_anomaly(
    zone_id: str,
    current_indices: Dict[str, float],
    baseline_mean: float = 0.45,
    baseline_std: float = 0.15,
) -> Dict[str, Any]:
    """
    # TODO: Load real baseline from Supabase or local JSON history.
    # TODO: Handle edge case where baseline_std == 0.
    """
    turbidity = current_indices.get("turbidity_proxy", 0.5)
    z = (turbidity - baseline_mean) / max(baseline_std, 1e-6)
    anomaly_score = max(0.0, min(1.0, (z + 2.0) / 4.0))

    level = "low"
    if anomaly_score > 0.70:
        level = "critical"
    elif anomaly_score > 0.50:
        level = "high"
    elif anomaly_score > 0.25:
        level = "medium"

    return {
        "status": "mock",
        "zone_id": zone_id,
        "z_score": round(z, 2),
        "anomaly_score": round(anomaly_score, 3),
        "anomaly_level": level,
        "confidence": 0.76,
        "explanation": f"Turbidity proxy is {z:.1f} standard deviations above baseline.",
        "note": "# TODO: Replace with real baseline lookup.",
    }
