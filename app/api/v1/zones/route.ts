import { NextResponse } from "next/server";
import { getZones, updateZone } from "@/lib/db";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";

export async function GET() {
  const zones = getZones();

  // Ensure each zone has a computed risk score
  const enriched = zones.map((zone) => {
    if (zone.risk_score === 0) {
      const computed = computeZoneRiskScore(zone.id);
      // Persist computed score
      updateZone(zone.id, {
        risk_score: computed.risk_score,
        risk_level: computed.risk_level,
      });
      return { ...zone, risk_score: computed.risk_score, risk_level: computed.risk_level };
    }
    return zone;
  });

  return NextResponse.json({ zones: enriched });
}
