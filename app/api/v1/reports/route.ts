import { NextResponse } from "next/server";
import {
  getReports,
  createReport,
  updateCitizen,
  getCitizenById,
} from "@/lib/db";
import { analyzePhoto } from "@/lib/services/photo-ai";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";
import { updateZone } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zone_id") || undefined;
  const status = searchParams.get("status") || undefined;

  const reports = getReports({ zone_id: zoneId, status });
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      zone_id,
      citizen_id,
      photo_url,
      lat,
      lng,
      description,
    } = body;

    if (!zone_id || !citizen_id || !photo_url) {
      return NextResponse.json(
        { error: "Missing required fields: zone_id, citizen_id, photo_url" },
        { status: 400 },
      );
    }

    // Check citizen exists
    const citizen = getCitizenById(citizen_id);
    if (!citizen) {
      return NextResponse.json(
        { error: "Citizen not found" },
        { status: 404 },
      );
    }

    // Analyze photo with AI
    const aiResult = await analyzePhoto(photo_url);

    // Award points
    const pointsAwarded = aiResult.needs_review ? 5 : 10;

    const report = createReport({
      zone_id,
      citizen_id,
      photo_url,
      lat: lat ?? 0,
      lng: lng ?? 0,
      description: description ?? "",
      status: aiResult.needs_review ? "pending" : "verified",
      points_awarded: pointsAwarded,
      photo_ai_score: aiResult.photo_ai_score,
      ai_analysis: aiResult as unknown as Record<string, unknown>,
    });

    // Update citizen points
    updateCitizen(citizen_id, {
      total_points: citizen.total_points + pointsAwarded,
      tier: computeTier(citizen.total_points + pointsAwarded),
    });

    // Recompute zone risk score
    const computed = computeZoneRiskScore(zone_id);
    updateZone(zone_id, {
      risk_score: computed.risk_score,
      risk_level: computed.risk_level,
    });

    return NextResponse.json({
      report_id: report.id,
      points_earned: pointsAwarded,
      photo_ai_score: aiResult.photo_ai_score,
      ai_analysis: aiResult,
      zone_risk_score: computed.risk_score,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function computeTier(points: number): "bronze" | "silver" | "gold" {
  if (points >= 500) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
}
