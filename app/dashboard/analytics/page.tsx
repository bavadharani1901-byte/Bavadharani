"use client";

import { useEffect, useState } from "react";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface AnalyticsData {
  summary: {
    total_reports: number;
    pending_reports: number;
    verified_reports: number;
    rejected_reports: number;
    total_zones: number;
    critical_zones: number;
    high_zones: number;
    avg_risk_score: number;
    total_cleanups: number;
  };
  pollution_by_category: { category: string; count: number }[];
  reports_by_month: { month: string; count: number }[];
  severity_distribution: { level: string; count: number }[];
  river_distribution: { river: string; reports: number; avg_risk: number }[];
  cleanup_progress: { status: string; count: number }[];
}

const SEV_COLORS: Record<string, string> = {
  critical: "#e52020",
  high: "#ef9100",
  medium: "#f59e0b",
  low: "#22c55e",
};

const CAT_COLORS = ["#0d9488", "#2563eb", "#7c3aed", "#ef9100", "#e52020", "#22c55e"];

function SummaryCard({ label, value, sub, color = "#0d9488" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1.5 text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/50">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics"); setLoading(false); });
  }, []);

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden mt-12 md:mt-0">
        <header className="flex shrink-0 items-center border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3.5">
          <div>
            <h1 className="text-base font-bold text-white">Analytics</h1>
            <p className="text-xs text-white/40">Pollution trends · River distribution · Cleanup progress</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Disclaimer */}
          <div className="rounded-sm border border-[#0d9488]/30 bg-[#0d9488]/10 px-4 py-2.5">
            <p className="text-[11px] text-[#0d9488]">
              <span className="font-bold">DEMO DATA · </span>
              Analytics are computed from project seed data. Not representative of actual Chennai river conditions.
            </p>
          </div>

          {error && <p className="text-sm text-[#e52020]">{error}</p>}

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-sm bg-[#1a2d4a]" />)}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard label="Total Reports" value={data.summary.total_reports} color="#0d9488" />
              <SummaryCard label="Pending" value={data.summary.pending_reports} color="#f59e0b" />
              <SummaryCard label="Verified" value={data.summary.verified_reports} color="#22c55e" />
              <SummaryCard label="Avg Risk Score" value={`${data.summary.avg_risk_score}/100`} color="#ef9100" />
              <SummaryCard label="Total Zones" value={data.summary.total_zones} color="#2563eb" />
              <SummaryCard label="Critical Zones" value={data.summary.critical_zones} color="#e52020" />
              <SummaryCard label="High Risk" value={data.summary.high_zones} color="#ef9100" />
              <SummaryCard label="Cleanup Actions" value={data.summary.total_cleanups} color="#0d9488" />
            </div>
          ) : null}

          {/* Charts Row 1 */}
          {data && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Pollution by category */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">Pollution by Category</h2>
                  {data.pollution_by_category.length === 0 ? (
                    <div className="flex h-52 items-center justify-center text-sm text-white/30">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.pollution_by_category} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#243b5e" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} width={110} />
                        <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                        <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                          {data.pollution_by_category.map((_, i) => (
                            <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Severity Distribution */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">Zone Severity Distribution</h2>
                  {data.severity_distribution.every((d) => d.count === 0) ? (
                    <div className="flex h-52 items-center justify-center text-sm text-white/30">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={data.severity_distribution} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="level">
                          {data.severity_distribution.map((entry) => (
                            <Cell key={entry.level} fill={SEV_COLORS[entry.level] ?? "#888"} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Reports trend */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">Report Submissions Trend</h2>
                  {data.reports_by_month.length === 0 ? (
                    <div className="flex h-52 items-center justify-center text-sm text-white/30">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={data.reports_by_month}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#243b5e" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                        <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={{ fill: "#0d9488", r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* River Distribution */}
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">Reports per River</h2>
                  {data.river_distribution.length === 0 ? (
                    <div className="flex h-52 items-center justify-center text-sm text-white/30">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.river_distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#243b5e" />
                        <XAxis dataKey="river" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                        <Bar dataKey="reports" name="Reports" fill="#0d9488" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="avg_risk" name="Avg Risk" fill="#ef9100" radius={[2, 2, 0, 0]} />
                        <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Cleanup Progress */}
              {data.cleanup_progress.length > 0 && (
                <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4">
                  <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/50">Cleanup & Inspection Activity</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.cleanup_progress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#243b5e" />
                      <XAxis dataKey="status" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#0f1d32", border: "1px solid #243b5e", fontSize: 12, color: "#fff" }} />
                      <Bar dataKey="count" fill="#22c55e" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          <p className="pb-4 text-center text-[10px] text-white/20">
            RiverGuard AI Analytics · Demo prototype · Data is illustrative only
          </p>
        </main>
      </div>
    </div>
  );
}
