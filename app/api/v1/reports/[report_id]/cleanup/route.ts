import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReportById, updateReport } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "GOVERNMENT") {
      return NextResponse.json({ error: "Government officer access required" }, { status: 403 });
    }

    const { report_id } = await params;
    const report = getReportById(report_id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, assigned_to } = body;

    const validStatuses = ["assigned", "in_progress", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = updateReport(report_id, {
      ai_analysis: {
        ...report.ai_analysis,
        cleanup_status: status,
        cleanup_notes: notes ?? report.ai_analysis?.cleanup_notes ?? "",
        cleanup_assigned_to: assigned_to ?? report.ai_analysis?.cleanup_assigned_to ?? "",
        cleanup_updated_at: new Date().toISOString(),
        cleanup_updated_by: session.user.id,
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Could not update report" }, { status: 500 });
    }

    return NextResponse.json({ report: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request or server error" }, { status: 500 });
  }
}
