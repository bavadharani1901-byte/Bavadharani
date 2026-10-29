import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processNewReport } from "@/lib/services/agentic-workflow";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { report_id, description, pollution_type, zone_id, photo_ai_score, location } = body;

    if (!report_id || !description || !zone_id) {
      return NextResponse.json(
        { error: "report_id, description, and zone_id are required." },
        { status: 400 }
      );
    }

    if (typeof description !== "string" || typeof zone_id !== "string") {
      return NextResponse.json({ error: "Invalid field types." }, { status: 400 });
    }

    const result = processNewReport({
      report_id: String(report_id),
      description: String(description).slice(0, 2000),
      pollution_type: pollution_type ? String(pollution_type) : undefined,
      zone_id: String(zone_id),
      photo_ai_score: typeof photo_ai_score === "number" ? photo_ai_score : 0,
      location: location ? String(location) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
