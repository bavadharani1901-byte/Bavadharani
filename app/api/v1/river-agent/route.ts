import { NextResponse } from "next/server";
// spawn is loaded dynamically — unavailable on Cloudflare Workers
let spawn: typeof import("node:child_process").spawn | null = null;
try { spawn = require("node:child_process").spawn; } catch { /* Workers */ }


function generateRuleBasedFallback(report: Record<string, unknown> | null) {
  const desc = String(report?.description || '').toLowerCase();
  const type = String(report?.pollution_type || 'unknown');
  let severity = 'moderate';
  let priority = 'medium';
  if (desc.includes('chemical') || desc.includes('toxic') || desc.includes('dead fish')) { severity = 'critical'; priority = 'immediate'; }
  else if (desc.includes('sewage') || desc.includes('oil')) { severity = 'high'; priority = 'high'; }
  else if (desc.includes('plastic') || desc.includes('trash')) { severity = 'moderate'; priority = 'medium'; }
  return {
    assessment: `Rule-based assessment for ${type}: severity=${severity}, priority=${priority}. This is NOT an AI analysis.`,
    severity,
    priority,
    pollution_type: type,
    recommendations: [
      severity === 'critical' ? 'Immediate inspection recommended' : 'Schedule routine inspection',
      'Collect water samples for lab analysis',
      'Document with photographs',
    ],
  };
}

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
    if (!spawn) throw new Error("child_process unavailable (serverless runtime)");
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
        { ...generateRuleBasedFallback(report), source: "rule_based_fallback", disclaimer: "Python river-agent sidecar not available. This is a rule-based fallback, not AI analysis." },
        { status: 200 }
      );
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    console.error("River agent API error:", error);
    // Graceful fallback when Python sidecar is unavailable
    return NextResponse.json(
        { ...generateRuleBasedFallback(null), source: "rule_based_fallback", disclaimer: "Python river-agent sidecar not running. Using rule-based fallback." },
        { status: 200 }
      );
  }
}
