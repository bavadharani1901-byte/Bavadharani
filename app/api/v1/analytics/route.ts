import { NextResponse } from "next/server";
import { getReports, getZones, getInspectorActions } from "@/lib/db";

export async function GET() {
  try {
    const reports = getReports();
    const zones = getZones();
    const actions = getInspectorActions();

    // Summary
    const total_reports = reports.length;
    const pending_reports = reports.filter((r) => r.status === "pending").length;
    const verified_reports = reports.filter((r) => r.status === "verified").length;
    const rejected_reports = reports.filter((r) => r.status === "rejected").length;
    const total_zones = zones.length;
    const critical_zones = zones.filter((z) => z.risk_level === "critical").length;
    const high_zones = zones.filter((z) => z.risk_level === "high").length;
    const avg_risk_score =
      zones.length > 0
        ? Math.round(zones.reduce((s, z) => s + (z.risk_score || 0), 0) / zones.length)
        : 0;
    const total_cleanups = actions.length;

    // Pollution by category — infer from description
    const categoryMap: Record<string, number> = {
      "Chemical Waste": 0,
      "Sewage / Drainage": 0,
      "Oil Spill": 0,
      "Plastic / Solid Waste": 0,
      "Turbidity / Sediment": 0,
      Other: 0,
    };
    const chemKw = ["chemical", "toxic", "industrial", "effluent", "factory", "dye", "foam"];
    const sewKw = ["sewage", "drainage", "foul", "sewer", "wastewater"];
    const oilKw = ["oil", "petroleum", "grease", "sheen", "slick", "fuel"];
    const plasticKw = ["plastic", "bottle", "bag", "polythene", "garbage", "trash", "debris"];
    const turbKw = ["muddy", "turbid", "brown", "murky", "cloudy", "sediment"];

    for (const r of reports) {
      const d = (r.description || "").toLowerCase();
      if (chemKw.some((k) => d.includes(k))) categoryMap["Chemical Waste"]++;
      else if (sewKw.some((k) => d.includes(k))) categoryMap["Sewage / Drainage"]++;
      else if (oilKw.some((k) => d.includes(k))) categoryMap["Oil Spill"]++;
      else if (plasticKw.some((k) => d.includes(k))) categoryMap["Plastic / Solid Waste"]++;
      else if (turbKw.some((k) => d.includes(k))) categoryMap["Turbidity / Sediment"]++;
      else categoryMap["Other"]++;
    }
    const pollution_by_category = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .filter((e) => e.count > 0);

    // Reports by month
    const monthMap: Record<string, number> = {};
    for (const r of reports) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    }
    const reports_by_month = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({ month, count }));

    // Severity distribution from zones
    const sevMap: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const z of zones) {
      sevMap[z.risk_level] = (sevMap[z.risk_level] || 0) + 1;
    }
    const severity_distribution = Object.entries(sevMap).map(([level, count]) => ({ level, count }));

    // River distribution
    const riverMap: Record<string, { reports: number; riskSum: number }> = {};
    for (const z of zones) {
      if (!riverMap[z.river_name]) riverMap[z.river_name] = { reports: 0, riskSum: 0 };
      riverMap[z.river_name].riskSum += z.risk_score || 0;
    }
    for (const r of reports) {
      const z = zones.find((z) => z.id === r.zone_id);
      if (z && riverMap[z.river_name]) {
        riverMap[z.river_name].reports++;
      }
    }
    const river_distribution = Object.entries(riverMap).map(([river, { reports: rpts, riskSum }]) => ({
      river,
      reports: rpts,
      avg_risk: Math.round(riskSum / Math.max(1, zones.filter((z) => z.river_name === river).length)),
    }));

    // Cleanup progress from inspector actions
    const cleanupMap: Record<string, number> = { inspected: 0, cleanup_assigned: 0, cleanup_completed: 0, other: 0 };
    for (const a of actions) {
      const k = a.action in cleanupMap ? a.action : "other";
      cleanupMap[k]++;
    }
    const cleanup_progress = Object.entries(cleanupMap)
      .map(([status, count]) => ({ status, count }))
      .filter((e) => e.count > 0);

    const recent_reports = reports.slice(0, 10);

    return NextResponse.json({
      summary: {
        total_reports,
        pending_reports,
        verified_reports,
        rejected_reports,
        total_zones,
        critical_zones,
        high_zones,
        avg_risk_score,
        total_cleanups,
      },
      pollution_by_category,
      reports_by_month,
      severity_distribution,
      river_distribution,
      cleanup_progress,
      recent_reports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
