"use client";

import { useEffect, useState, useCallback } from "react";

export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  river_name: string;
  province: string;
  basin: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
}

export function useZones(pollInterval = 5000) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/zones");
      if (!res.ok) throw new Error("Failed to fetch zones");
      const data = await res.json();
      setZones(data.zones ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZones();
    if (pollInterval <= 0) return;
    const timer = setInterval(fetchZones, pollInterval);
    return () => clearInterval(timer);
  }, [fetchZones, pollInterval]);

  return { zones, loading, error, refetch: fetchZones };
}
