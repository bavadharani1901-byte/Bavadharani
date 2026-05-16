import unittest

from model_runner import (
    build_photo_ai_result,
    severity_level_from_score,
    turbidity_level_from_prob,
)


class PhotoAIModelRunnerTests(unittest.TestCase):
    def test_non_water_gates_pollution_signals(self):
        result = build_photo_ai_result(
            probabilities={
                "is_water_scene": 0.1,
                "floating_trash": 0.99,
                "turbid_water": 0.99,
            },
            quality_result={
                "image_quality": "good",
                "quality_score": 1.0,
                "quality_issues": [],
            },
            color_result={
                "water_color": "brown",
                "abnormal_color_score": 0.55,
            },
            thresholds={
                "is_water_scene": 0.5,
                "floating_trash": 0.85,
                "turbid_water": 0.3,
            },
        )

        self.assertFalse(result["is_water_scene"])
        self.assertFalse(result["floating_trash"])
        self.assertFalse(result["turbid_water"])
        self.assertEqual(result["photo_ai_score"], 0.0)
        self.assertTrue(result["needs_review"])

    def test_builds_expected_score_for_valid_water_photo(self):
        result = build_photo_ai_result(
            probabilities={
                "is_water_scene": 0.9,
                "floating_trash": 0.9,
                "turbid_water": 0.8,
            },
            quality_result={
                "image_quality": "good",
                "quality_score": 0.75,
                "quality_issues": [],
            },
            color_result={
                "water_color": "brown",
                "abnormal_color_score": 0.55,
            },
            thresholds={
                "is_water_scene": 0.5,
                "floating_trash": 0.85,
                "turbid_water": 0.3,
            },
        )

        self.assertTrue(result["is_water_scene"])
        self.assertTrue(result["floating_trash"])
        self.assertTrue(result["turbid_water"])
        self.assertEqual(result["turbidity_level"], "turbid")
        self.assertEqual(result["severity_score"], 0.825)
        self.assertEqual(result["severity_level"], "critical")
        self.assertEqual(result["confidence"], 0.867)
        self.assertEqual(result["photo_ai_score"], 0.536)

    def test_level_helpers_match_contract(self):
        self.assertEqual(severity_level_from_score(0.25), "low")
        self.assertEqual(severity_level_from_score(0.5), "moderate")
        self.assertEqual(severity_level_from_score(0.75), "high")
        self.assertEqual(severity_level_from_score(0.76), "critical")
        self.assertEqual(turbidity_level_from_prob(0.2, "brown", 0.3), "clear")
        self.assertEqual(turbidity_level_from_prob(0.86, "black", 0.3), "very_turbid")


if __name__ == "__main__":
    unittest.main()
