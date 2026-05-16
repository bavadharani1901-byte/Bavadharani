import { NextResponse } from "next/server";
import { getZoneById, updateZone } from "@/lib/db";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ zone_id: string }> },
) {
  const { zone_id } = await params;
  const zone = getZoneById(zone_id);

  if (!zone) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }

  const computed = computeZoneRiskScore(zone_id);
  const updated = updateZone(zone_id, {
    risk_score: computed.risk_score,
    risk_level: computed.risk_level,
  });

  return NextResponse.json({
    zone: updated,
    risk_score: computed.risk_score,
    risk_level: computed.risk_level,
    breakdown: computed.breakdown,
    explanation: computed.explanation,
  });
}
