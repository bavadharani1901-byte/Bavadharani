import { getSatelliteAnomalies, getSatelliteObservations } from "@/lib/db";

// TODO: When the Python GEE pipeline is ready, call ai/satellite/gee_client.py
//       via a Python subprocess or an internal microservice endpoint to get
//       live Sentinel-2 data instead of reading from seed JSON fallback.

export interface SatelliteData {
  anomaly_score: number;
  confidence: number;
  z_score: number;
  anomaly_level: string;
  explanation: string;
  observation: {
    ndwi: number;
    mndwi: number;
    turbidity_proxy: number;
    cloud_percentage: number;
    valid_pixel_ratio: number;
    quality_status: string;
    captured_at: string;
  } | null;
}

export function getSatelliteDataForZone(zoneId: string): SatelliteData {
  const anomalies = getSatelliteAnomalies(zoneId);
  const anomaly = anomalies[0];

  if (!anomaly) {
    return {
      anomaly_score: 0.0,
      confidence: 0.0,
      z_score: 0.0,
      anomaly_level: "low",
      explanation: "No satellite data available for this zone.",
      observation: null,
    };
  }

  const observations = getSatelliteObservations(zoneId);
  const observation = observations[0] ?? null;

  return {
    anomaly_score: anomaly.anomaly_score,
    confidence: anomaly.confidence,
    z_score: anomaly.z_score,
    anomaly_level: anomaly.anomaly_level,
    explanation: anomaly.explanation,
    observation: observation
      ? {
          ndwi: observation.ndwi,
          mndwi: observation.mndwi,
          turbidity_proxy: observation.turbidity_proxy,
          cloud_percentage: observation.cloud_percentage,
          valid_pixel_ratio: observation.valid_pixel_ratio,
          quality_status: observation.quality_status,
          captured_at: observation.captured_at,
        }
      : null,
  };
}
