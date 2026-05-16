import unittest

from gee_precompute import (
    anomaly_level_from_score,
    build_anomaly_result,
    confidence_score,
    quality_status_from_valid_pixels,
    sync_db_json,
)
import json
import tempfile
from pathlib import Path


class SatelliteAnomalyTests(unittest.TestCase):
    def test_anomaly_mapping_matches_markdown(self):
        self.assertEqual(anomaly_level_from_score(0.30), "low")
        self.assertEqual(anomaly_level_from_score(0.31), "medium")
        self.assertEqual(anomaly_level_from_score(0.61), "high")
        self.assertEqual(anomaly_level_from_score(0.86), "critical")

    def test_build_anomaly_result_uses_abs_z_over_three(self):
        result = build_anomaly_result(
            zone_id="zone_a",
            latest={
                "ndwi": 0.2,
                "mndwi": 0.1,
                "turbidity_proxy": 0.8,
                "cloud_percentage": 10.0,
                "valid_pixel_ratio": 0.8,
                "captured_at": "2026-05-01T00:00:00Z",
            },
            historical_values=[0.3, 0.4, 0.5, 0.6, 0.7],
        )

        self.assertEqual(result["zone_id"], "zone_a")
        self.assertEqual(result["anomaly_level"], "high")
        self.assertGreater(result["z_score"], 2.0)
        self.assertAlmostEqual(result["anomaly_score"], min(abs(result["z_score"]) / 3, 1), 3)

    def test_quality_and_confidence(self):
        self.assertEqual(quality_status_from_valid_pixels(0.70), "good")
        self.assertEqual(quality_status_from_valid_pixels(0.40), "moderate")
        self.assertEqual(quality_status_from_valid_pixels(0.39), "poor")
        self.assertGreater(confidence_score(0.8, 12, 0.9), 0.5)

    def test_sync_db_json_updates_satellite_tables(self):
        reading = build_anomaly_result(
            zone_id="zone_a",
            latest={
                "ndwi": 0.2,
                "mndwi": 0.1,
                "turbidity_proxy": 0.8,
                "cloud_percentage": 10.0,
                "valid_pixel_ratio": 0.8,
                "captured_at": "2026-05-01T00:00:00Z",
            },
            historical_values=[0.3, 0.4, 0.5, 0.6, 0.7],
        )

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "db.json"
            db_path.write_text(json.dumps({"satellite_observations": [], "satellite_anomalies": []}))
            sync_db_json([reading], db_path)
            db = json.loads(db_path.read_text())

        self.assertEqual(db["satellite_observations"][0]["historical_mean"], 0.5)
        self.assertEqual(db["satellite_anomalies"][0]["anomaly_score"], reading["anomaly_score"])


if __name__ == "__main__":
    unittest.main()
