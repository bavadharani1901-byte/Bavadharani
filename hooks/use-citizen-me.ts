"use client";

import { useEffect, useState, useCallback } from "react";

export interface CitizenMe {
  id: string;
  display_name: string;
  total_points: number;
  tier: "bronze" | "silver" | "gold";
  created_at: string;
}

export function useCitizenMe() {
  const [citizen, setCitizen] = useState<CitizenMe | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCitizen = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/citizens/me", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch citizen");
      const data = await res.json();
      setCitizen(data.citizen ?? null);
    } catch {
      setCitizen(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCitizen();
  }, [fetchCitizen]);

  return { citizen, loading, refetch: fetchCitizen };
}
