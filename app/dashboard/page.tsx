"use client";

import { useState, useEffect } from "react";
import { useZones } from "@/hooks/use-zones";
import { useReports } from "@/hooks/use-reports";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertTriangle, FileText, Map, TrendingUp, Wrench, RefreshCw } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  critical: "#e52020",
  high: "#ef9100",
  medium: "#f59e0b",
  low: "#22c55e",
};

const SEVERITY_PIE_COLORS = ["#e52020", "#ef9100", "#f59e0b", "#22c55e"];

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "#0d9488",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    pending: "bg-[#f59e0b]/20 text-[#f59e0b]",
    verified: "bg-[#22c55e]/20 text-[#22c55e]",
    rejected: "bg-[#e52020]/20 text-[#e52020]",
  };
  return (
    <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase ${cfg[status] ?? "bg-white/10 text-white/50"}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { zones, loading: zonesLoading, refetch } = useZones(30000);
  const { reports, loading: reportsLoading } = useReports();
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("en-IN"));
  }, [zones]);

  const loading = zonesLoading || reportsLoading;

  // Computed stats
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;
  const criticalZones = zones.filter((z) => z.risk_level === "critical").length;
  const avgRisk = zones.length
    ? Math.round(zones.reduce((s, z) => s + (z.risk_score || 0), 0) / zones.length)
    : 0;
  const totalCleanups = zones.filter((z) => z.risk_score > 0).length;

  // Severity distribution pie data
  const sevMap: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  zones.forEach((z) => { sevMap[z.risk_level] = (sevMap[z.risk_level] || 0) + 1; });
  const pieData = Object.entries(sevMap)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.toUpperCase(), value }));

  // Reports trend by date
  const trendMap: Record<string, number> = {};
  reports.forEach((r) => {
    const d = new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    trendMap[d] = (trendMap[d] || 0) + 1;
  });
  const trendData = Object.entries(trendMap)
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  const recentReports = reports.slice(0, 6);
  const sortedZones = [...zones].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden md:ml-0 mt-12 md:mt-0">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3.5">
          <div>
            <h1 className="text-base font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/40">Chennai River Monitoring · Tamil Nadu, India</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-[11px] text-white/30 sm:inline">Updated {lastUpdated}</span>
            )}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-sm bg-[#1a2d4a] px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </header>

        {/* Main scroll */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Demo disclaimer */}
          <div className="rounded-sm border border-[#0d9488]/30 bg-[#0d9488]/10 px-4 py-2.5">
            <p className="text-[11px] text-[#0d9488]">
              <span className="font-bold">DEMO SYSTEM · </span>
              Illustrative data for prototype purposes. Risk scores are computed from project seed data, not live sensor readings.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-sm bg-[#1a2d4a]" />
              ))
            ) : (
              <>
                <SummaryCard
                  label="Total Reports"
                  value={totalReports}
                  sub={`${pendingReports} pending review`}
                  icon={FileText}
                  color="#0d9488"
                />
                <SummaryCard
                  label="Critical Zones"
                  value={criticalZones}
                  sub={`of ${zones.length} total zones`}
                  icon={AlertTriangle}
                  color="#e52020"
                />
                <SummaryCard
                  label="Avg Risk Score"
                  value={`${avgRisk}/100`}
                  sub="across all zones"
                  icon={TrendingUp}
                  color="#ef9100"
                />
                <SummaryCard
                  label="Monitored Zones"
                  value={totalCleanups}
                  sub="active monitoring"
                  icon={Map}
                  color="#22c55e"
                />
              </>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Severity Pie */}
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
                Pollution Severity Distribution
              </h2>
              {loading ? (
                <div className="h-52 animate-pulse rounded-sm bg-[#0f1d32]" />
              ) : pieData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-sm text-white/30">
                  No zone data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={SEVERITY_PIE_COLORS[i % SEVERITY_PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Reports Trend */}
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
                Report Submissions Over Time
              </h2>
              {loading ? (
                <div className="h-52 animate-pulse rounded-sm bg-[#0f1d32]" />
              ) : trendData.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-sm text-white/30">
                  No report data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#243b5e" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                    <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ fill: "#0d9488", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Two-col lower section */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* High-risk Zones */}
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
                Highest Risk Zones
              </h2>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-2 h-10 animate-pulse rounded-sm bg-[#0f1d32]" />
                ))
              ) : sortedZones.length === 0 ? (
                <p className="text-sm text-white/30 py-4 text-center">No zones loaded</p>
              ) : (
                <div className="space-y-2">
                  {sortedZones.map((z) => (
                    <div key={z.id} className="flex items-center justify-between rounded-sm bg-[#0f1d32] px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: RISK_COLORS[z.risk_level] ?? "#888" }}
                        />
                        <span className="truncate text-sm text-white">{z.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-white">{z.risk_score}</span>
                        <span
                          className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: `${RISK_COLORS[z.risk_level]}20`,
                            color: RISK_COLORS[z.risk_level],
                          }}
                        >
                          {z.risk_level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Reports */}
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
                Recent Reports
              </h2>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="mb-2 h-12 animate-pulse rounded-sm bg-[#0f1d32]" />
                ))
              ) : recentReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-white/20 mb-2" />
                  <p className="text-sm text-white/30">No reports yet</p>
                  <p className="text-xs text-white/20 mt-1">Reports from citizens will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentReports.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded-sm bg-[#0f1d32] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-white">
                          {r.description || "No description"}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {r.zone_id} · {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cleanup stats */}
          <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-white/50">
              Cleanup & Inspection Statistics
            </h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {[
                { label: "Monitored", value: zones.length, color: "#0d9488" },
                { label: "Critical", value: zones.filter((z) => z.risk_level === "critical").length, color: "#e52020" },
                { label: "High Risk", value: zones.filter((z) => z.risk_level === "high").length, color: "#ef9100" },
                { label: "Medium", value: zones.filter((z) => z.risk_level === "medium").length, color: "#f59e0b" },
                { label: "Low Risk", value: zones.filter((z) => z.risk_level === "low").length, color: "#22c55e" },
                { label: "Verified", value: reports.filter((r) => r.status === "verified").length, color: "#0d9488" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="pb-4 text-center text-[10px] text-white/20">
            RiverGuard AI · Chennai, Tamil Nadu · Demo prototype · Data is illustrative only
          </p>
        </main>
      </div>
    </div>
  );
}
