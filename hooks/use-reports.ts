"use client";

import { useEffect, useState, useCallback } from "react";

export interface Report {
  id: string;
  zone_id: string;
  citizen_id: string;
  photo_url: string;
  lat: number;
  lng: number;
  description: string;
  status: string;
  points_awarded: number;
  photo_ai_score: number;
  ai_analysis: Record<string, unknown>;
  created_at: string;
}

export function useReports(zoneId?: string) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const url = zoneId
        ? `/api/v1/reports?zone_id=${zoneId}`
        : "/api/v1/reports";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}
