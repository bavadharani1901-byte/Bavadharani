"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useZones } from "@/hooks/use-zones";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import { Bot, AlertTriangle, CheckCircle, Clock, ChevronRight } from "lucide-react";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type WorkflowStatus = "recommendation" | "pending_approval" | "approved" | "completed";

interface WorkflowAction {
  id: string;
  type: string;
  status: WorkflowStatus;
  description: string;
  priority: string;
  assigned_to?: string;
  created_at: string;
  requires_approval: boolean;
}

interface WorkflowResult {
  report_id: string;
  zone_id: string;
  risk_analysis: {
    risk_score: number;
    risk_level: RiskLevel;
    category: string;
    evidence: string[];
    recommendations: string[];
    breakdown: Record<string, number>;
    disclaimer: string;
  };
  actions: WorkflowAction[];
  summary: string;
  next_steps: string;
  disclaimer: string;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH: "#ef9100",
  CRITICAL: "#e52020",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#e52020",
  high: "#ef9100",
  medium: "#f59e0b",
  low: "#22c55e",
};

const STATUS_ICONS: Record<WorkflowStatus, React.ElementType> = {
  recommendation: ChevronRight,
  pending_approval: Clock,
  approved: CheckCircle,
  completed: CheckCircle,
};

function ActionRow({ action, onApprove }: { action: WorkflowAction; onApprove: (id: string) => void }) {
  const StatusIcon = STATUS_ICONS[action.status] ?? ChevronRight;
  const isApprovable = action.requires_approval && action.status === "recommendation";
  return (
    <div className="flex items-start gap-3 rounded-sm bg-[#0f1d32] border border-[#1a2d4a] p-3">
      <StatusIcon
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ color: action.status === "completed" ? "#22c55e" : action.status === "approved" ? "#0d9488" : "#f59e0b" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80">{action.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <span className="text-[10px] text-white/30">{action.type.replace(/_/g, " ")}</span>
          {action.assigned_to && (
            <span className="text-[10px] text-white/40">→ {action.assigned_to}</span>
          )}
          <span
            className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{ backgroundColor: `${PRIORITY_COLORS[action.priority]}20`, color: PRIORITY_COLORS[action.priority] }}
          >
            {action.priority}
          </span>
          <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase bg-white/10 text-white/50">
            {action.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>
      {isApprovable && (
        <button
          onClick={() => onApprove(action.id)}
          className="shrink-0 rounded-sm bg-[#0d9488]/20 border border-[#0d9488]/40 px-2.5 py-1 text-[10px] font-bold text-[#0d9488] hover:bg-[#0d9488]/30 transition-colors"
        >
          Approve
        </button>
      )}
    </div>
  );
}

const POLLUTION_TYPES = [
  "Chemical Waste",
  "Sewage / Drainage",
  "Oil Spill",
  "Plastic / Solid Waste",
  "Turbidity / Sediment",
  "General Pollution",
];

export default function AIWorkflowPage() {
  const { zones } = useZones(0);
  const { data: session } = useSession();
  const [description, setDescription] = useState("");
  const [pollutionType, setPollutionType] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, WorkflowStatus>>({});

  async function analyzeReport() {
    if (!description.trim()) { setError("Please enter a description."); return; }
    if (!zoneId) { setError("Please select a zone."); return; }
    if (!session?.user?.id) { setError("You must be signed in to use this feature."); return; }

    setLoading(true);
    setError("");
    setResult(null);
    setActionStates({});

    try {
      const res = await fetch("/api/v1/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: `demo_${Date.now()}`,
          description,
          pollution_type: pollutionType || undefined,
          zone_id: zoneId,
          photo_ai_score: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(actionId: string) {
    setActionStates((prev) => ({ ...prev, [actionId]: "approved" }));
  }

  const actionsWithState: WorkflowAction[] = (result?.actions ?? []).map((a) => ({
    ...a,
    status: actionStates[a.id] ?? a.status,
  }));

  const riskColor = result ? RISK_COLORS[result.risk_analysis.risk_level] : "#0d9488";
  const score = result?.risk_analysis.risk_score ?? 0;

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden mt-12 md:mt-0">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3.5">
          <Bot className="h-5 w-5 text-[#0d9488]" />
          <div>
            <h1 className="text-base font-bold text-white">AI Workflow Engine</h1>
            <p className="text-xs text-white/40">Rule-based analysis · Human approval required for actions</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Disclaimer */}
          <div className="rounded-sm border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#f59e0b] mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#f59e0b]">DEMO: Rule-Based Classification System</p>
              <p className="text-[11px] text-[#f59e0b]/70 mt-0.5">
                This engine uses keyword matching, not a trained ML model or real AI. Scores are illustrative. All recommended actions require authorized officer review before execution.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Input Form */}
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Analyze Report</h2>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1 block">Zone *</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full rounded-sm bg-[#0f1d32] border border-[#243b5e] px-3 py-2 text-sm text-white outline-none focus:border-[#0d9488]"
                >
                  <option value="">Select a zone…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1 block">Pollution Type</label>
                <select
                  value={pollutionType}
                  onChange={(e) => setPollutionType(e.target.value)}
                  className="w-full rounded-sm bg-[#0f1d32] border border-[#243b5e] px-3 py-2 text-sm text-white outline-none focus:border-[#0d9488]"
                >
                  <option value="">Select category (optional)…</option>
                  {POLLUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-white/40 mb-1 block">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the pollution observed — e.g., heavy chemical discharge with foam and foul smell near the bridge…"
                  rows={5}
                  className="w-full resize-none rounded-sm bg-[#0f1d32] border border-[#243b5e] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-[#0d9488]"
                />
              </div>

              {error && <p className="text-xs text-[#e52020]">{error}</p>}

              <button
                onClick={analyzeReport}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#0d9488] py-2.5 text-sm font-bold text-white hover:bg-[#0b7a70] transition-colors disabled:opacity-50"
              >
                <Bot className="h-4 w-4" />
                {loading ? "Analyzing…" : "Run AI Analysis"}
              </button>
            </div>

            {/* Results */}
            {result ? (
              <div className="space-y-4">
                {/* Risk Score */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4"
                      style={{ borderColor: riskColor }}
                    >
                      <span className="text-2xl font-bold" style={{ color: riskColor }}>{score}</span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30">Risk Score</p>
                      <span
                        className="mt-1 inline-block rounded-sm px-3 py-1 text-sm font-bold uppercase"
                        style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                      >
                        {result.risk_analysis.risk_level}
                      </span>
                      <p className="mt-1 text-xs text-white/50">Category: {result.risk_analysis.category}</p>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Pollution Category Scores</h3>
                  <div className="space-y-2">
                    {Object.entries(result.risk_analysis.breakdown).map(([cat, score]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-white/60 truncate">{cat}</span>
                          <span className="text-white/40 shrink-0 ml-2">{score}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#0f1d32] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${score}%`, backgroundColor: score > 75 ? "#e52020" : score > 50 ? "#ef9100" : score > 25 ? "#f59e0b" : "#22c55e" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Evidence Detected</h3>
                  <ul className="space-y-1.5">
                    {result.risk_analysis.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d9488]" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Recommendations</h3>
                  <ul className="space-y-1.5">
                    {result.risk_analysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0d9488]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-[10px] text-white/25 italic">{result.risk_analysis.disclaimer}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-10 text-center">
                <Bot className="h-12 w-12 text-white/10 mb-3" />
                <p className="text-sm text-white/30">Analysis results will appear here</p>
                <p className="text-xs text-white/20 mt-1">Fill in the form and click "Run AI Analysis"</p>
              </div>
            )}
          </div>

          {/* Workflow Actions */}
          {result && (
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Workflow Actions</h2>
                <span className="text-[10px] text-white/30">{actionsWithState.filter((a) => a.requires_approval && a.status === "recommendation").length} pending approval</span>
              </div>

              <div className="rounded-sm border border-[#f59e0b]/20 bg-[#f59e0b]/5 px-3 py-2">
                <p className="text-[10px] text-[#f59e0b]/80">
                  Actions marked <strong>"recommendation"</strong> are suggestions only. Clicking "Approve" is a local demo action — in production it would trigger officer workflow.
                </p>
              </div>

              <div className="space-y-2">
                {actionsWithState.map((action) => (
                  <ActionRow key={action.id} action={action} onApprove={handleApprove} />
                ))}
              </div>

              <div className="rounded-sm bg-[#0f1d32] border border-[#1a2d4a] p-3">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-xs text-white/60">{result.summary}</p>
                <p className="text-xs text-[#0d9488] mt-2">{result.next_steps}</p>
              </div>

              <p className="text-[10px] text-white/20 italic">{result.disclaimer}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
