
"use client";

import Link from "next/link";
import { Flame, Camera, Gift, Trophy } from "lucide-react";
import CitizenRiverMap from "@/components/citizen/citizen-river-map";
import type { Zone } from "@/hooks/use-zones";

interface CitizenHomeProps {
  zones: Array<Zone & { distance_km: number }>;
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

export default function CitizenHome({
  zones,
  citizen,
}: CitizenHomeProps) {
  const progress = citizen.total_points;
  const max = tierMax(citizen.tier);
  const pct = Math.min(100, (progress / max) * 100);

  return (
    <main className="flex-1 bg-white px-4 py-4">
      {/* Alert */}
      <div className="mb-4 rounded-sm border border-[#cccccc] bg-[#f7f7f7] p-3">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-black">
          <Flame className="h-4 w-4 text-[#e52020]" />
          {zones.length} river zones monitored
        </p>
      </div>

      {/* Progress */}
      <section className="mb-6">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-[#757575]">
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
          {pct >= 100
            ? " - Maxed!"
            : ` → ${Math.max(0, max - progress)} pts to next tier`}
        </p>
      </section>

      {/* Main actions */}
      <section className="mb-6 grid gap-3">
        <Link
          href="/citizen/report"
          className="flex h-11 items-center justify-center gap-2 rounded-sm bg-[#76b900] text-sm font-bold text-black transition-all hover:bg-[#5a8d00] active:scale-[0.98]"
        >
          <Camera className="h-4 w-4" />
          Report Pollution
        </Link>

        <Link
          href="/citizen/leaderboard"
          className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[#cccccc] bg-white text-sm font-bold text-black transition-all hover:bg-[#f7f7f7] active:scale-[0.98]"
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </Link>

        <Link
          href="/citizen/rewards"
          className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[#cccccc] bg-white text-sm font-bold text-black transition-all hover:bg-[#f7f7f7] active:scale-[0.98]"
        >
          <Gift className="h-4 w-4" />
          Rewards
        </Link>
      </section>

      {/* Interactive river map */}
      <CitizenRiverMap zones={zones} />

      {/* Nearby zones */}
      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#757575]">
          Monitored River Zones
        </p>

        <div className="space-y-2">
          {zones.map((zone) => (
            <Link
              key={zone.id}
              href={`/citizen/report?zone=${encodeURIComponent(zone.id)}`}
              className="flex items-center justify-between gap-3 rounded-sm border border-[#e5e5e5] bg-white p-3 transition-colors hover:bg-[#f7f7f7]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    zone.risk_level === "critical"
                      ? "bg-[#e52020]"
                      : zone.risk_level === "high"
                        ? "bg-[#df6500]"
                        : zone.risk_level === "medium"
                          ? "bg-[#ef9100]"
                          : "bg-[#3f8500]"
                  }`}
                />

                <span className="text-sm text-black">
                  {zone.name}
                </span>
              </div>

              <span className="shrink-0 text-xs capitalize text-[#757575]">
                {zone.risk_level} risk
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
