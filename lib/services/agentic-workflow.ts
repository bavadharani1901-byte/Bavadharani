// RiverGuard AI — Agentic Workflow Engine
// DISCLAIMER: Rule-based workflow. All consequential actions require human officer approval.

import { analyzePollutionReport, type PollutionAnalysis } from "./pollution-ai";

export interface WorkflowAction {
  id: string;
  type: "analysis" | "inspection_recommendation" | "notification" | "monitoring" | "sampling" | "follow_up";
  status: "recommendation" | "pending_approval" | "approved" | "completed";
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  assigned_to?: string;
  created_at: string;
  requires_approval: boolean;
}

export interface WorkflowResult {
  report_id: string;
  zone_id: string;
  risk_analysis: PollutionAnalysis;
  actions: WorkflowAction[];
  summary: string;
  next_steps: string;
  disclaimer: string;
}

let _actionCounter = 0;
function makeId(): string {
  return `wf_${Date.now()}_${++_actionCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

export function processNewReport(params: {
  report_id: string;
  description: string;
  pollution_type?: string;
  zone_id: string;
  photo_ai_score?: number;
  location?: string;
}): WorkflowResult {
  const { report_id, description, pollution_type, zone_id, photo_ai_score = 0, location } = params;

  // Step 1: Run pollution analysis
  const risk_analysis = analyzePollutionReport({ description, pollution_type, photo_ai_score, location });
  const { risk_level, risk_score, category } = risk_analysis;

  const actions: WorkflowAction[] = [];

  // Always: log analysis action (auto, no approval)
  actions.push({
    id: makeId(),
    type: "analysis",
    status: "completed",
    description: `Automated risk analysis completed. Category: ${category}. Score: ${risk_score}/100 (${risk_level}).`,
    priority: risk_level === "CRITICAL" ? "critical" : risk_level === "HIGH" ? "high" : risk_level === "MEDIUM" ? "medium" : "low",
    created_at: now(),
    requires_approval: false,
  });

  // Based on risk level, add workflow actions
  if (risk_level === "CRITICAL") {
    actions.push({
      id: makeId(),
      type: "inspection_recommendation",
      status: "recommendation",
      description: `CRITICAL: Immediate field inspection recommended for zone ${zone_id}. Deploy environmental inspection team within 24 hours.`,
      priority: "critical",
      assigned_to: "Field Inspection Team",
      created_at: now(),
      requires_approval: true,
    });
    actions.push({
      id: makeId(),
      type: "notification",
      status: "recommendation",
      description: "Notify Tamil Nadu Pollution Control Board (TNPCB) of critical pollution event.",
      priority: "critical",
      assigned_to: "TNPCB Liaison Officer",
      created_at: now(),
      requires_approval: true,
    });
    actions.push({
      id: makeId(),
      type: "sampling",
      status: "recommendation",
      description: "Collect water samples from affected river segment for laboratory analysis (pH, BOD, COD, heavy metals).",
      priority: "critical",
      assigned_to: "Water Quality Lab Team",
      created_at: now(),
      requires_approval: true,
    });
    actions.push({
      id: makeId(),
      type: "notification",
      status: "recommendation",
      description: "Issue public advisory for river segment — notify downstream communities of potential water quality risk.",
      priority: "high",
      assigned_to: "Public Communication Officer",
      created_at: now(),
      requires_approval: true,
    });
  } else if (risk_level === "HIGH") {
    actions.push({
      id: makeId(),
      type: "inspection_recommendation",
      status: "recommendation",
      description: `HIGH PRIORITY: Field inspection recommended for zone ${zone_id} within 48–72 hours. Identify and document pollution source.`,
      priority: "high",
      assigned_to: "Field Inspection Team",
      created_at: now(),
      requires_approval: true,
    });
    actions.push({
      id: makeId(),
      type: "monitoring",
      status: "recommendation",
      description: "Increase monitoring frequency for this river zone. Cross-reference with upstream industrial discharge records.",
      priority: "high",
      created_at: now(),
      requires_approval: true,
    });
  } else if (risk_level === "MEDIUM") {
    actions.push({
      id: makeId(),
      type: "inspection_recommendation",
      status: "recommendation",
      description: `MEDIUM PRIORITY: Schedule routine inspection for zone ${zone_id} within 7 days.`,
      priority: "medium",
      assigned_to: "Routine Inspection Team",
      created_at: now(),
      requires_approval: true,
    });
    actions.push({
      id: makeId(),
      type: "monitoring",
      status: "recommendation",
      description: "Update zone monitoring data and flag for weekly review.",
      priority: "medium",
      created_at: now(),
      requires_approval: false,
    });
  } else {
    actions.push({
      id: makeId(),
      type: "follow_up",
      status: "recommendation",
      description: `LOW PRIORITY: Log incident for zone ${zone_id}. Continue standard monitoring cycle.`,
      priority: "low",
      created_at: now(),
      requires_approval: false,
    });
  }

  // Always add follow-up
  actions.push({
    id: makeId(),
    type: "follow_up",
    status: "pending_approval",
    description: "Schedule follow-up verification after 14 days to confirm resolution or escalation.",
    priority: risk_level === "CRITICAL" || risk_level === "HIGH" ? "high" : "low",
    created_at: now(),
    requires_approval: true,
  });

  const approvalRequired = actions.filter((a) => a.requires_approval && a.status === "recommendation").length;
  const autoCompleted = actions.filter((a) => !a.requires_approval).length;

  const summary = `Report ${report_id} processed. Risk: ${risk_level} (${risk_score}/100) for ${category}. ` +
    `${autoCompleted} action(s) completed automatically. ${approvalRequired} action(s) pending officer approval.`;

  const next_steps = approvalRequired > 0
    ? `${approvalRequired} workflow action(s) require officer review and approval before execution. Visit the Officer Management portal to review.`
    : "All actions logged. Continue standard monitoring protocol.";

  return {
    report_id,
    zone_id,
    risk_analysis,
    actions,
    summary,
    next_steps,
    disclaimer:
      "DEMO: This workflow engine uses rule-based logic, not autonomous AI decision-making. All consequential actions are recommendations requiring authorized human approval.",
  };
}
