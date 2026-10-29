from typing import Any
import json


def assess_pollution_report(report: dict[str, Any]) -> dict[str, Any]:
    pollution_type = str(report.get("pollution_type", "unknown")).lower()
    description = str(report.get("description", "")).lower()

    severity = 1
    reasons = []

    if any(word in pollution_type for word in ["chemical", "industrial", "oil"]):
        severity = 3
        reasons.append("Potential chemical or industrial pollution")

    if any(word in description for word in [
        "dead fish", "fish dying", "toxic", "chemical smell", "oil spill"
    ]):
        severity = max(severity, 3)
        reasons.append("Serious pollution warning in description")

    if any(word in pollution_type for word in ["plastic", "trash", "garbage", "solid waste"]):
        reasons.append("Visible solid-waste pollution reported")

    if any(word in pollution_type for word in ["sewage", "wastewater"]):
        severity = max(severity, 2)
        reasons.append("Possible sewage or wastewater contamination")

    if any(word in description for word in ["large amount", "heavy", "overflow"]):
        severity = max(severity, 2)
        reasons.append("Potentially large pollution incident")

    priorities = {1: "LOW", 2: "HIGH", 3: "CRITICAL"}
    actions = {
        1: "Record report and schedule initial inspection.",
        2: "Prioritise site inspection and notify the responsible officer.",
        3: "Urgently escalate for qualified environmental inspection.",
    }

    return {
        "agent": "RiverGuard Rule-Based Triage Agent",
        "report_id": report.get("report_id", "DEMO-001"),
        "river_name": report.get("river_name", "Unknown river"),
        "priority": priorities[severity],
        "severity_level": severity,
        "reasons": reasons or ["No predefined high-risk indicators detected"],
        "recommended_action": actions[severity],
        "status": "AWAITING_HUMAN_REVIEW",
        "demo_mode": True,
    }


if __name__ == "__main__":
    sample_report = {
        "report_id": "DEMO-001",
        "river_name": "Cooum",
        "pollution_type": "chemical waste",
        "description": "Strong chemical smell and dead fish reported",
    }
    print(json.dumps(assess_pollution_report(sample_report), indent=2))

