"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, Flame, Gift, Trophy } from "lucide-react";

interface CitizenHomeProps {
  zones: Array<{
    id: string;
    name: string;
    risk_level: string;
    distance_km: number;
  }>;
  citizen: {
    display_name: string;
    total_points: number;
    tier: string;
  };
}

function tierMax(tier: string) {
  if (tier === "gold") return 2000;
  if (tier === "silver") return 500;
  return 100;
}

export default function CitizenHome({ zones, citizen }: CitizenHomeProps) {
  const [progress] = useState(citizen.total_points);
  const max = tierMax(citizen.tier);
  const pct = Math.min(100, (progress / max) * 100);

  return (
    <main className="flex-1 px-4 py-4 bg-white">
        {/* Alert */}
        <div className="mb-4 rounded-sm border border-[#cccccc] bg-[#f7f7f7] p-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#000000]">
            <Flame className="h-4 w-4 text-[#e52020]" />
            {zones.length} zones near you need verification today
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-[#757575] uppercase">
              Your Progress
            </p>
            <p className="text-xs text-[#757575]">
              {progress} / {max} pts
            </p>
          </div>
          <div className="h-2 w-full bg-[#e5e5e5]">
            <div
              className="h-full bg-[#76b900] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#757575]">
            {citizen.tier.charAt(0).toUpperCase() + citizen.tier.slice(1)} tier
            {pct >= 100 ? " - Maxed!" : ` → ${max - progress} pts to next tier`}
          </p>
        </div>

        {/* CTAs */}
        <div className="mb-6 grid gap-3">
          <Link
            href="/citizen/report"
            className="flex h-11 items-center justify-center gap-2 rounded-sm bg-[#76b900] text-sm font-bold text-black transition-all hover:bg-[#5a8d00] active:scale-[0.98]"
          >
            <Camera className="h-4 w-4" />
            Report Pollution
          </Link>
          <Link
            href="/citizen/leaderboard"
            className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[#cccccc] bg-white text-sm font-bold text-[#000000] transition-all hover:bg-[#f7f7f7] active:scale-[0.98]"
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </Link>
          <Link
            href="/citizen/rewards"
            className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[#cccccc] bg-white text-sm font-bold text-[#000000] transition-all hover:bg-[#f7f7f7] active:scale-[0.98]"
          >
            <Gift className="h-4 w-4" />
            Rewards
          </Link>
        </div>

        {/* Nearby zones */}
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-[#757575] uppercase">
            Nearby zones needing reports
          </p>
          <div className="space-y-2">
            {zones.map((z) => (
              <Link
                key={z.id}
                href={`/citizen/report?zone=${z.id}`}
                className="flex items-center justify-between rounded-sm border border-[#e5e5e5] bg-white p-3 transition-colors hover:bg-[#f7f7f7]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      z.risk_level === "critical"
                        ? "bg-[#e52020]"
                        : z.risk_level === "high"
                          ? "bg-[#df6500]"
                          : z.risk_level === "medium"
                            ? "bg-[#ef9100]"
                            : "bg-[#3f8500]"
                    }`}
                  />
                  <span className="text-sm text-[#000000]">{z.name}</span>
                </div>
                <span className="text-xs text-[#757575]">
                  {z.distance_km}km
                </span>
              </Link>
            ))}
          </div>
        </div>
    </main>
  );
}
