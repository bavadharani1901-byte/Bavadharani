"use client";

import { useZones } from "@/hooks/use-zones";
import { useCitizenMe } from "@/hooks/use-citizen-me";
import CitizenHome from "@/components/citizen/citizen-home";
import CitizenNav from "@/components/citizen/citizen-nav";

export default function CitizenPage() {
  const { zones } = useZones(0);
  const { citizen, loading } = useCitizenMe();

  const nearbyZones = zones.slice(0, 5).map((z, i) => ({
    id: z.id,
    name: z.name,
    risk_level: z.risk_level,
    distance_km: [0.5, 1.2, 2.3, 3.1, 4.5][i] ?? 1.0,
  }));

  const citizenData = citizen ?? {
    display_name: "Citizen",
    total_points: 0,
    tier: "bronze" as const,
  };

  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      <CitizenNav />
      {loading ? (
        <main className="flex-1 px-4 py-4">
          <div className="mb-4 h-10 animate-pulse rounded-sm border border-[#e5e5e5] bg-[#f7f7f7]" />
          <div className="mb-6 h-8 animate-pulse rounded-sm bg-[#e5e5e5]" />
          <div className="mb-6 grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-sm bg-[#e5e5e5]"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-sm border border-[#e5e5e5] bg-[#f7f7f7]"
              />
            ))}
          </div>
        </main>
      ) : (
        <CitizenHome zones={nearbyZones} citizen={citizenData} />
      )}
    </div>
  );
}
