"use client";

import { useReports } from "@/hooks/use-reports";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NgoAnalyticsPage() {
  const { reports, loading } = useReports();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const key = new Date(r.created_at).toISOString().split("T")[0];
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        label: formatDate(date),
        submissions: count,
      }));
  }, [reports]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <header className="flex h-14 items-center border-b bg-background px-4">
          <h1 className="text-xl font-bold uppercase">NGO Analytics</h1>
        </header>
        <main className="flex-1 p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center border-b bg-background px-4">
        <h1 className="text-xl font-bold uppercase">NGO Analytics</h1>
      </header>
      <Separator />
      <main className="flex-1 bg-background p-6">
        <h2 className="mb-6 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Citizen Submissions Over Time
        </h2>
        <div className="h-96 w-full rounded-sm border bg-muted/20 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#757575" }}
                axisLine={{ stroke: "#cccccc" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#757575" }}
                axisLine={{ stroke: "#cccccc" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #cccccc",
                  borderRadius: "2px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                stroke="#76b900"
                strokeWidth={2}
                dot={{ fill: "#76b900", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
