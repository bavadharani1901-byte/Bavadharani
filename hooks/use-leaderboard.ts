"use client";

import { useEffect, useState, useCallback } from "react";

export interface Citizen {
  id: string;
  display_name: string;
  total_points: number;
  tier: "bronze" | "silver" | "gold";
  created_at: string;
}

export function useLeaderboard(limit = 10) {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/leaderboard?limit=${limit}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data = await res.json();
      setCitizens(data.leaderboard ?? []);
    } catch {
      setCitizens([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { citizens, loading, refetch: fetchLeaderboard };
}
