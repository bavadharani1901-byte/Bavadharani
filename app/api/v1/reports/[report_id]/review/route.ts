import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReportById, updateReport } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "GOVERNMENT") return NextResponse.json({ error: "Government officer access required" }, { status: 403 });

    const { report_id } = await params;
    const report = getReportById(report_id);
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (report.status !== "pending") return NextResponse.json({ error: "Only pending reports can be reviewed" }, { status: 409 });

    const body = await request.json();
    const decision = body?.decision;
    if (decision !== "approve" && decision !== "reject") return NextResponse.json({ error: "Decision must be approve or reject" }, { status: 400 });

    const updated = updateReport(report_id, { status: decision === "approve" ? "verified" : "rejected" });
    if (!updated) return NextResponse.json({ error: "Could not update report" }, { status: 500 });
    return NextResponse.json({ report: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request or server error" }, { status: 500 });
  }
}
