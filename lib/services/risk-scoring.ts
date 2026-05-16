import {
  getSatelliteAnomalies,
  getOsmSources,
  getReports,
  getInspectorActions,
} from "@/lib/db";

export interface RiskBreakdown {
  satellite_anomaly: number;
  source_attribution: number;
  photo_ai: number;
  citizen_reports: number;
  inspector_adjustment: number;
}

export interface RiskScoreResult {
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  breakdown: RiskBreakdown;
  explanation: string;
}

export function riskLevelFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 85) return "high";
  return "critical";
}

export function computeRiskScore(
  satelliteAnomalyScore: number,
  satelliteConfidence: number,
  sourceRiskScore: number,
  photoAiScore: number,
  citizenReportScore: number,
  inspectorResolved: boolean,
): RiskScoreResult {
  // Confidence-weight satellite
  const effectiveSatellite = satelliteAnomalyScore * satelliteConfidence;

  const rawScore =
    0.30 * effectiveSatellite +
    0.20 * sourceRiskScore +
    0.25 * photoAiScore +
    0.15 * citizenReportScore -
    (inspectorResolved ? 0.10 : 0.0);

  const riskScore = Math.max(0, Math.min(100, rawScore * 100));
  const roundedScore = Math.round(riskScore);
  const riskLevel = riskLevelFromScore(roundedScore);

  const breakdown: RiskBreakdown = {
    satellite_anomaly: parseFloat((0.30 * effectiveSatellite).toFixed(2)),
    source_attribution: parseFloat((0.20 * sourceRiskScore).toFixed(2)),
    photo_ai: parseFloat((0.25 * photoAiScore).toFixed(2)),
    citizen_reports: parseFloat((0.15 * citizenReportScore).toFixed(2)),
    inspector_adjustment: inspectorResolved ? -0.10 : 0.0,
  };

  const explanation = buildExplanation(breakdown, riskLevel, inspectorResolved);

  return {
    risk_score: roundedScore,
    risk_level: riskLevel,
    breakdown,
    explanation,
  };
}

export function computeCitizenReportScore(zoneId: string): number {
  const reports = getReports({ zone_id: zoneId, status: "verified" });
  if (reports.length === 0) return 0.0;

  // Simple MVP: normalize count against a max of 20 reports
  const maxReports = 20;
  const normalized = Math.min(reports.length / maxReports, 1.0);

  // Weight by average photo AI score
  const avgPhotoAi =
    reports.reduce((sum, r) => sum + (r.photo_ai_score || 0), 0) /
    Math.max(reports.length, 1);

  return parseFloat((normalized * 0.5 + avgPhotoAi * 0.5).toFixed(3));
}

export function computeZoneRiskScore(zoneId: string): RiskScoreResult {
  const anomalies = getSatelliteAnomalies(zoneId);
  const anomaly = anomalies[0];
  const satelliteAnomalyScore = anomaly?.anomaly_score ?? 0.0;
  const satelliteConfidence = anomaly?.confidence ?? 0.0;

  const osm = getOsmSources(zoneId);
  // Sum risk contributions as a proxy for source_risk_score (0-1)
  const totalOsmRisk = osm.reduce((sum, s) => sum + (s.risk_contribution || 0), 0);
  const sourceRiskScore = Math.min(totalOsmRisk, 1.0);

  const reports = getReports({ zone_id: zoneId, status: "verified" });
  const avgPhotoAi =
    reports.length > 0
      ? reports.reduce((sum, r) => sum + (r.photo_ai_score || 0), 0) /
        reports.length
      : 0.0;

  const citizenReportScore = computeCitizenReportScore(zoneId);

  const inspectorActions = getInspectorActions(zoneId);
  const inspectorResolved = inspectorActions.some((a) => a.action === "inspected");

  return computeRiskScore(
    satelliteAnomalyScore,
    satelliteConfidence,
    sourceRiskScore,
    avgPhotoAi,
    citizenReportScore,
    inspectorResolved,
  );
}

function buildExplanation(
  breakdown: RiskBreakdown,
  riskLevel: string,
  inspectorResolved: boolean,
): string {
  const parts: string[] = [];

  if (breakdown.satellite_anomaly > 0.15) {
    parts.push(
      `Satellite turbidity is elevated (${(breakdown.satellite_anomaly * 100).toFixed(0)}% confidence).`,
    );
  }

  if (breakdown.source_attribution > 0.1) {
    parts.push(
      `Industrial/domestic sources found nearby (${(breakdown.source_attribution * 100).toFixed(0)}% contribution).`,
    );
  }

  if (breakdown.photo_ai > 0.1) {
    parts.push(
      `Citizen photo AI indicates visual pollution (${(breakdown.photo_ai * 100).toFixed(0)}% signal).`,
    );
  }

  if (breakdown.citizen_reports > 0.05) {
    parts.push(
      `${breakdown.citizen_reports > 0.1 ? "Multiple" : "Some"} verified citizen reports in the last 30 days.`,
    );
  }

  if (inspectorResolved) {
    parts.push("Inspector has marked this zone as recently inspected.");
  }

  if (parts.length === 0) {
    parts.push("No significant risk signals detected at this time.");
  }

  parts.push(`Overall risk level: ${riskLevel.toUpperCase()}.`);

  return parts.join(" ");
}
