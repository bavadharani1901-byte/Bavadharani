import { NextResponse } from "next/server";
import {
  getReports,
  createReport,
  updateCitizen,
  getOrCreateCitizenByUserId,
} from "@/lib/db";
import { analyzePhoto } from "@/lib/services/photo-ai";
import { computeZoneRiskScore } from "@/lib/services/risk-scoring";
import { updateZone } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zone_id") || undefined;
  const status = searchParams.get("status") || undefined;

  const reports = getReports({ zone_id: zoneId, status });
  return NextResponse.json({ reports });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      zone_id,
      photo_url,
      lat,
      lng,
      description,
    } = body;

    if (!zone_id || !photo_url) {
      return NextResponse.json(
        { error: "Missing required fields: zone_id, photo_url" },
        { status: 400 },
      );
    }

    // Ensure citizen record exists for the authenticated user
    const citizen = getOrCreateCitizenByUserId(
      session.user.id,
      session.user.name || "Citizen",
    );

    // Analyze photo with AI
    const aiResult = await analyzePhoto(photo_url);

    // Award points
    const pointsAwarded = aiResult.needs_review ? 5 : 10;
    const previousPoints =
      typeof citizen.total_points === "number" && Number.isFinite(citizen.total_points)
        ? citizen.total_points
        : 0;
    const updatedPoints = previousPoints + pointsAwarded;

    const report = createReport({
      zone_id,
      citizen_id: citizen.id,
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
    const updatedCitizen = updateCitizen(citizen.id, {
      total_points: updatedPoints,
      tier: computeTier(updatedPoints),
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
      total_points: updatedCitizen?.total_points ?? updatedPoints,
      tier: updatedCitizen?.tier ?? computeTier(updatedPoints),
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
