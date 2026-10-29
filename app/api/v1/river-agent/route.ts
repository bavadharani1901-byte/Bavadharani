import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const report = await request.json();

    if (
      !report ||
      typeof report !== "object" ||
      typeof report.pollution_type !== "string" ||
      typeof report.description !== "string"
    ) {
      return NextResponse.json(
        { error: "pollution_type and description are required." },
        { status: 400 }
      );
    }

    const input = JSON.stringify(report);
    const python = spawn(
      "python",
      ["-c", [
        "import json, sys",
        "from ai.river_agent.agent import assess_pollution_report",
        "report = json.load(sys.stdin)",
        "print(json.dumps(assess_pollution_report(report)))"
      ].join("; ")],
      { cwd: process.cwd(), windowsHide: true }
    );

    let stdout = "";
    let stderr = "";

    python.stdout.setEncoding("utf8");
    python.stderr.setEncoding("utf8");
    python.stdout.on("data", (chunk: string) => { stdout += chunk; });
    python.stderr.on("data", (chunk: string) => { stderr += chunk; });

    const result = await new Promise<{ code: number | null }>((resolve, reject) => {
      python.on("error", reject);
      python.on("close", (code) => resolve({ code }));
      python.stdin.end(input);
    });

    if (result.code !== 0) {
      console.error("River agent failed:", stderr);
      return NextResponse.json(
        { error: "River agent could not process the report." },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    console.error("River agent API error:", error);
    return NextResponse.json(
      { error: "Invalid request or agent error." },
      { status: 500 }
    );
  }
}
