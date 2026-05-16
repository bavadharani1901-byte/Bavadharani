"use client";

import CitizenRewards from "@/components/citizen/citizen-rewards";
import CitizenNav from "@/components/citizen/citizen-nav";
import { useCitizenMe } from "@/hooks/use-citizen-me";

export default function RewardsPage() {
  const { citizen, loading } = useCitizenMe();

  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      <CitizenNav />
      {loading || !citizen ? (
        <main className="flex-1 px-4 py-4">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-[#757575]">
              Your Points
            </p>
            <p className="text-4xl font-bold uppercase leading-[0.9] text-[#000000]">
              --
            </p>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-sm border border-[#e5e5e5] bg-[#f7f7f7]"
              />
            ))}
          </div>
        </main>
      ) : (
        <CitizenRewards totalPoints={citizen.total_points} />
      )}
    </div>
  );
}
