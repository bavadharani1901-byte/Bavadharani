import { NextResponse } from "next/server";
import { getZoneById, updateZone, getReports } from "@/lib/db";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";
import { getSatelliteDataForZone } from "@/lib/services/satellite";
import { getSourceAttribution } from "@/lib/services/osm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ zone_id: string }> },
) {
  const { zone_id } = await params;
  const zone = getZoneById(zone_id);

  if (!zone) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }

  // Ensure risk score is computed
  if (zone.risk_score === 0) {
    const computed = computeZoneRiskScore(zone_id);
    updateZone(zone_id, {
      risk_score: computed.risk_score,
      risk_level: computed.risk_level,
    });
    zone.risk_score = computed.risk_score;
    zone.risk_level = computed.risk_level;
  }

  const satellite = getSatelliteDataForZone(zone_id);
  const osm = getSourceAttribution(zone_id);
  const reports = getReports({ zone_id: zone_id });
  const riskResult = computeZoneRiskScore(zone_id);

  return NextResponse.json({
    zone,
    risk_score: riskResult.risk_score,
    risk_level: riskResult.risk_level,
    breakdown: riskResult.breakdown,
    explanation: riskResult.explanation,
    satellite,
    osm_attribution: osm,
    reports,
  });
}
