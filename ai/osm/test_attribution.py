import unittest

from overpass_precompute import (
    aggregate_sources,
    classify_source,
    distance_decay,
    haversine_km,
    source_contribution,
)


class OsmAttributionTests(unittest.TestCase):
    def test_classifies_osm_tags(self):
        self.assertEqual(classify_source({"landuse": "industrial"}), "industrial")
        self.assertEqual(classify_source({"man_made": "wastewater_plant"}), "wastewater")
        self.assertEqual(classify_source({"waterway": "drain"}), "drainage")
        self.assertEqual(classify_source({"landuse": "farmland"}), "agricultural")
        self.assertEqual(classify_source({"landuse": "residential"}), "domestic")

    def test_distance_and_contribution(self):
        self.assertAlmostEqual(haversine_km(0, 0, 0, 1), 111.19, places=1)
        self.assertAlmostEqual(distance_decay(1.0), 0.5, places=2)
        self.assertGreater(source_contribution("wastewater", 0.5), source_contribution("domestic", 0.5))

    def test_aggregate_sources(self):
        result = aggregate_sources("zone_a", [
            {
                "name": "Factory",
                "type": "industrial",
                "distance_km": 0.5,
                "position_context": "unknown",
                "risk_contribution": 0.3,
            },
            {
                "name": "Drain",
                "type": "drainage",
                "distance_km": 0.2,
                "position_context": "unknown",
                "risk_contribution": 0.2,
            },
        ])

        self.assertEqual(result["zone_id"], "zone_a")
        self.assertEqual(result["dominant_source_type"], "industrial")
        self.assertAlmostEqual(result["source_risk_score"], 0.5, places=2)
        self.assertEqual(result["source_attribution"]["industrial"], 0.6)


if __name__ == "__main__":
    unittest.main()
