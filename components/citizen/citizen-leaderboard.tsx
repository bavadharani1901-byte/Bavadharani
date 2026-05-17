"use client";

import { useSession } from "next-auth/react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function CitizenLeaderboard() {
  const { citizens, loading } = useLeaderboard(10);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "citizen_01";

  return (
    <main className="flex-1 px-4 py-4">
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {citizens.map((citizen, index) => {
            const isCurrent = citizen.id === currentUserId;
            const displayName =
              typeof citizen.display_name === "string" && citizen.display_name.trim().length > 0
                ? citizen.display_name
                : "Anonymous Citizen";
            const tier =
              typeof citizen.tier === "string" && citizen.tier.length > 0
                ? citizen.tier.toUpperCase()
                : "BRONZE";
            const points =
              typeof citizen.total_points === "number" && Number.isFinite(citizen.total_points)
                ? citizen.total_points
                : 0;

            return (
              <div
                key={citizen.id}
                className={`flex items-center gap-3 border p-3 rounded-sm ${
                  isCurrent
                    ? "border-[#000000] bg-[#f7f7f7]"
                    : "border-[#e5e5e5]"
                }`}
              >
                <span className="w-6 text-sm font-bold text-[#757575]">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#000000]">
                    {displayName}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-[#757575]">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#757575]">
                    {tier}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#000000]">
                  {points} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
