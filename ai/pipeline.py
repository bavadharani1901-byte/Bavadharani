"""
WAVE AI Pipeline Orchestrator — Satellite + OSM + Photo AI wiring test script.

# TODO: After each sub-pipeline is implemented, run this script end-to-end:
#   1. gee_client.fetch_sentinel2_for_zone(...)
#   2. index_calculator.calculate_indices(...)
#   3. anomaly_detector.compute_anomaly(...)
#   4. quality_control.assess_quality(...)
#   5. overpass_client.fetch_sources_for_zone(...)
#   6. source_classifier.classify_source(...)
#   7. distance_scorer.score_source(...)
#   8. attribution_builder.build_attribution(...)
#   9. validator.analyze_photo(...)

For now, this file serves as a smoke-test runner for mock outputs.
"""

import json

# TODO: from ai.satellite import gee_client, index_calculator, anomaly_detector, quality_control
# TODO: from ai.osm import overpass_client, source_classifier, distance_scorer, attribution_builder
# TODO: from ai.photo_ai import validator


def run_mock_pipeline(zone_id: str = "saigon_river_01", image_path: str = "dummy.jpg"):
    """Run all AI modules with mock data and print JSON output."""
    print("=" * 60)
    print("WAVE AI MOCK PIPELINE")
    print("=" * 60)

    # Satellite
    sat_meta = {
        "status": "mock",
        "note": "# TODO: Wire real GEE pipeline.",
    }
    print("\n[SATELLITE]", json.dumps(sat_meta, indent=2))

    # OSM
    osm_meta = {
        "status": "mock",
        "note": "# TODO: Wire real Overpass pipeline.",
    }
    print("\n[OSM]", json.dumps(osm_meta, indent=2))

    # Photo AI
    photo_meta = {
        "status": "mock",
        "note": "# TODO: Wire real CV model from ai/water-cv/",
    }
    print("\n[PHOTO AI]", json.dumps(photo_meta, indent=2))

    print("\n" + "=" * 60)
    print("All modules return mock data. Replace TODOs to enable live AI.")
    print("=" * 60)


if __name__ == "__main__":
    run_mock_pipeline()
