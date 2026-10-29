"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import { Check, X, RefreshCw } from "lucide-react";

type Report = {
  id: string;
  zone_id: string;
  description: string;
  photo_url: string;
  status: string;
  photo_ai_score: number;
  created_at: string;
  lat: number;
  lng: number;
};

export default function ReportsReviewPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/reports?status=pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load reports");
      setReports(data.reports || []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "GOVERNMENT") {
      void loadReports();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session?.user?.role]);

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
      setReports((cur) => cur.filter((r) => r.id !== id));
      setMessage(`Report ${decision === "approve" ? "approved ✓" : "rejected ✗"}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

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
            <p className="text-sm text-white/50 mt-2">Government officer account required to review reports.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden mt-12 md:mt-0">
        <header className="flex shrink-0 items-center justify-between border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3.5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#0d9488] uppercase">RiverGuard AI · Officer Portal</p>
            <h1 className="mt-0.5 text-base font-bold text-white">Pending Reports Review</h1>
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
          {message && (
            <div className="rounded-sm border border-[#0d9488]/30 bg-[#0d9488]/10 px-4 py-2.5 text-sm text-[#0d9488]">
              {message}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-sm bg-[#1a2d4a]" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] p-12 text-center">
              <Check className="h-10 w-10 text-[#22c55e] mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No pending reports</p>
              <p className="text-xs text-white/40 mt-1">New citizen reports awaiting review will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => {
                const isBusy = busyId === report.id;
                return (
                  <article key={report.id} className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] overflow-hidden">
                    {report.photo_url && (
                      <img
                        src={report.photo_url}
                        alt="Citizen-submitted pollution evidence"
                        className="h-40 w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">{report.zone_id}</h3>
                          <p className="text-xs text-white/40 mt-0.5">
                            {new Date(report.created_at).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <span className="rounded-sm bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] font-bold text-[#f59e0b] uppercase shrink-0">
                          Pending
                        </span>
                      </div>

                      <p className="text-xs text-white/70">{report.description || "No description provided."}</p>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-white/40">
                        <div>AI Score: <span className="text-white/60">{Math.round(report.photo_ai_score * 100)}%</span></div>
                        <div>Location: <span className="text-white/60">{report.lat.toFixed(3)}, {report.lng.toFixed(3)}</span></div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => void reviewReport(report.id, "approve")}
                          disabled={busyId !== null}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#22c55e]/20 border border-[#22c55e]/30 py-2 text-xs font-bold text-[#22c55e] hover:bg-[#22c55e]/30 transition-colors disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isBusy ? "Processing…" : "Approve"}
                        </button>
                        <button
                          onClick={() => void reviewReport(report.id, "reject")}
                          disabled={busyId !== null}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-sm bg-[#e52020]/20 border border-[#e52020]/30 py-2 text-xs font-bold text-[#e52020] hover:bg-[#e52020]/30 transition-colors disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          {isBusy ? "Processing…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
