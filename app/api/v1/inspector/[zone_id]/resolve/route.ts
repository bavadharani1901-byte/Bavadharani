import { NextResponse } from "next/server";
import {
  getZoneById,
  createInspectorAction,
  updateZone,
} from "@/lib/db";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ zone_id: string }> },
) {
  const { zone_id } = await params;
  const zone = getZoneById(zone_id);

  if (!zone) {
    return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { inspector_id, action = "inspected", notes = "" } = body;

    const resolvedAt = new Date().toISOString();

    createInspectorAction({
      zone_id,
      inspector_id: inspector_id ?? "inspector_01",
      action,
      notes,
      resolved_at: resolvedAt,
    });

    // Recompute risk score with inspector resolved flag
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
      resolved_at: resolvedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
