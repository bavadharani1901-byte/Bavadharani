"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import { useZones } from "@/hooks/use-zones";
import { Check, X, Wrench, RefreshCw, Filter } from "lucide-react";

interface Report {
  id: string;
  zone_id: string;
  description: string;
  photo_url: string;
  status: string;
  photo_ai_score: number;
  points_awarded: number;
  created_at: string;
  lat: number;
  lng: number;
  ai_analysis?: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  verified: "#22c55e",
  rejected: "#e52020",
};

function cleanupStatus(r: Report): string {
  return (r.ai_analysis?.cleanup_status as string) || "";
}

export default function OfficerPage() {
  const { data: session, status } = useSession();
  const { zones } = useZones(0);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cleanupForm, setCleanupForm] = useState<{
    assignedTo: string;
    notes: string;
    cleanupStatus: string;
  }>({ assignedTo: "", notes: "", cleanupStatus: "assigned" });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/v1/reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (status === "authenticated") void loadReports();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, loadReports]);

  async function reviewReport(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
      setMessage(`Report ${decision === "approve" ? "approved ✓" : "rejected ✗"}`);
      void loadReports();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitCleanup(reportId: string) {
    setBusyId(reportId);
    setMessage("");
    try {
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(reportId)}/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: cleanupForm.cleanupStatus,
          notes: cleanupForm.notes,
          assigned_to: cleanupForm.assignedTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cleanup update failed");
      setMessage("Cleanup status updated ✓");
      setExpandedId(null);
      void loadReports();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const filteredReports = reports.filter((r) => {
    if (filterZone !== "all" && r.zone_id !== filterZone) return false;
    return true;
  });

  const zoneIds = Array.from(new Set(reports.map((r) => r.zone_id)));

  const stats = {
    pending: reports.filter((r) => r.status === "pending").length,
    verified: reports.filter((r) => r.status === "verified").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a1628]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
      </div>
    );
  }

  if (!session || session.user?.role !== "GOVERNMENT") {
    return (
      <div className="flex h-screen bg-[#0a1628]">
        <SidebarNav />
        <main className="flex-1 flex items-center justify-center mt-12 md:mt-0">
          <div className="text-center">
            <X className="h-12 w-12 text-[#e52020] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Access Denied</h2>
            <p className="text-sm text-white/50 mt-2">Government officer account required.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden mt-12 md:mt-0">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3">
          <div>
            <h1 className="text-base font-bold text-white">Officer Management</h1>
            <p className="text-xs text-white/40">Review reports · Assign cleanup · Track status</p>
          </div>
          <button
            onClick={() => void loadReports()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-sm bg-[#1a2d4a] px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Pending", value: stats.pending, color: "#f59e0b" },
              { label: "Verified", value: stats.verified, color: "#22c55e" },
              { label: "Rejected", value: stats.rejected, color: "#e52020" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-4 text-center">
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-white/30 shrink-0" />
            {["all", "pending", "verified", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-sm px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                  filterStatus === s
                    ? "bg-[#0d9488] text-white"
                    : "bg-[#1a2d4a] text-white/50 hover:text-white"
                }`}
              >
                {s === "all" ? `All (${reports.length})` : `${s} (${reports.filter((r) => r.status === s).length})`}
              </button>
            ))}
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-2 py-1.5 text-xs text-white/70 outline-none ml-auto"
            >
              <option value="all">All Zones</option>
              {zoneIds.map((id) => (
                <option key={id} value={id}>{zones.find((z) => z.id === id)?.name ?? id}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          {message && (
            <div className="rounded-sm border border-[#0d9488]/30 bg-[#0d9488]/10 px-4 py-2.5 text-sm text-[#0d9488]">
              {message}
            </div>
          )}

          {/* Reports */}
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-sm bg-[#1a2d4a]" />
            ))
          ) : filteredReports.length === 0 ? (
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-10 text-center">
              <p className="text-white/40 text-sm">No reports match the current filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const isExpanded = expandedId === report.id;
                const isBusy = busyId === report.id;
                const zone = zones.find((z) => z.id === report.zone_id);
                const cs = cleanupStatus(report);

                return (
                  <div key={report.id} className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] overflow-hidden">
                    {/* Report summary row */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#243b5e]/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {report.description || "No description"}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {zone?.name ?? report.zone_id} · {new Date(report.created_at).toLocaleDateString("en-IN")} · AI Score: {Math.round(report.photo_ai_score * 100)}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cs && (
                          <span className="rounded-sm bg-[#0d9488]/20 text-[#0d9488] px-2 py-0.5 text-[10px] font-bold uppercase">
                            {cs.replace(/_/g, " ")}
                          </span>
                        )}
                        <span
                          className="rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ backgroundColor: `${STATUS_COLORS[report.status]}20`, color: STATUS_COLORS[report.status] }}
                        >
                          {report.status}
                        </span>
                        <span className="text-white/30">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-[#243b5e] bg-[#0f1d32] p-4 space-y-4">
                        {/* Photo */}
                        {report.photo_url && (
                          <img
                            src={report.photo_url}
                            alt="Report evidence"
                            className="h-40 w-full rounded-sm object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}

                        <div className="grid grid-cols-2 gap-3 text-xs text-white/60">
                          <div><span className="text-white/30">Zone:</span> {zone?.name ?? report.zone_id}</div>
                          <div><span className="text-white/30">Points:</span> {report.points_awarded}</div>
                          <div><span className="text-white/30">Lat:</span> {report.lat}</div>
                          <div><span className="text-white/30">Lng:</span> {report.lng}</div>
                          <div><span className="text-white/30">AI Score:</span> {Math.round(report.photo_ai_score * 100)}%</div>
                          <div><span className="text-white/30">ID:</span> {report.id.slice(0, 16)}…</div>
                        </div>

                        {/* Approve / Reject (only for pending) */}
                        {report.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => void reviewReport(report.id, "approve")}
                              disabled={isBusy}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#22c55e]/20 border border-[#22c55e]/30 py-2 text-xs font-bold text-[#22c55e] hover:bg-[#22c55e]/30 transition-colors disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {isBusy ? "Processing…" : "Approve"}
                            </button>
                            <button
                              onClick={() => void reviewReport(report.id, "reject")}
                              disabled={isBusy}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#e52020]/20 border border-[#e52020]/30 py-2 text-xs font-bold text-[#e52020] hover:bg-[#e52020]/30 transition-colors disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              {isBusy ? "Processing…" : "Reject"}
                            </button>
                          </div>
                        )}

                        {/* Cleanup assignment */}
                        <div className="border border-[#243b5e] rounded-sm p-3 space-y-3">
                          <p className="text-xs font-bold text-white/50 uppercase tracking-wide flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5" />
                            Cleanup Assignment
                          </p>
                          <div className="grid gap-2">
                            <select
                              value={cleanupForm.cleanupStatus}
                              onChange={(e) => setCleanupForm((f) => ({ ...f, cleanupStatus: e.target.value }))}
                              className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-2 py-1.5 text-xs text-white/70 outline-none w-full"
                            >
                              <option value="assigned">Assigned</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Assigned to (officer / team)"
                              value={cleanupForm.assignedTo}
                              onChange={(e) => setCleanupForm((f) => ({ ...f, assignedTo: e.target.value }))}
                              className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#0d9488] w-full"
                            />
                            <textarea
                              placeholder="Resolution notes…"
                              value={cleanupForm.notes}
                              onChange={(e) => setCleanupForm((f) => ({ ...f, notes: e.target.value }))}
                              rows={2}
                              className="resize-none rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#0d9488] w-full"
                            />
                            <button
                              onClick={() => void submitCleanup(report.id)}
                              disabled={isBusy}
                              className="rounded-sm bg-[#0d9488] py-2 text-xs font-bold text-white hover:bg-[#0b7a70] transition-colors disabled:opacity-50"
                            >
                              {isBusy ? "Updating…" : "Update Cleanup Status"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
