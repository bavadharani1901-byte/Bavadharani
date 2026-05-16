"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, Check, X } from "lucide-react";

const REWARDS = [
  { id: "r1", name: "Seedling Pack", points: 100, description: "5 native tree seedlings for your community." },
  { id: "r2", name: "Small Voucher", points: 250, description: "10 USD VinGroup eco-store voucher." },
  { id: "r3", name: "Large Voucher", points: 1000, description: "50 USD VinGroup eco-store voucher." },
];

interface CitizenRewardsProps {
  totalPoints: number;
}

export default function CitizenRewards({ totalPoints }: CitizenRewardsProps) {
  const { data: session } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<(typeof REWARDS)[0] | null>(null);

  return (
    <main className="flex-1 px-4 py-4">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#757575]">
          Your Points
        </p>
        <p className="text-4xl font-bold uppercase leading-[0.9] text-[#000000]">
          {totalPoints}
        </p>
        <p className="mt-1 text-xs text-[#757575]">
          {session?.user?.name || "Citizen"}
        </p>
      </div>

      <div className="space-y-3">
        {REWARDS.map((reward) => {
          const canAfford = totalPoints >= reward.points;
          return (
            <div
              key={reward.id}
              className="flex items-center justify-between border border-[#cccccc] p-3 rounded-sm"
            >
              <div>
                <p className="text-sm font-bold text-[#000000]">{reward.name}</p>
                <p className="text-xs text-[#757575]">{reward.description}</p>
                <p className="mt-1 text-xs font-bold text-[#000000]">
                  {reward.points} pts
                </p>
              </div>
              <button
                disabled={!canAfford}
                onClick={() => {
                  setSelectedReward(reward);
                  setModalOpen(true);
                }}
                className="h-8 rounded-sm bg-[#76b900] px-4 text-xs font-bold text-black disabled:bg-[#e5e5e5] disabled:text-[#757575] hover:bg-[#5a8d00] active:scale-[0.98] transition-all"
              >
                Redeem
              </button>
            </div>
          );
        })}
      </div>

      {modalOpen && selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white p-6 border border-[#cccccc] rounded-sm">
            <h3 className="mb-2 text-xl font-bold uppercase leading-[0.95] text-[#000000]">
              Confirm Redemption
            </h3>
            <p className="mb-4 text-sm text-[#1a1a1a]">
              Redeem <strong>{selectedReward.name}</strong> for{" "}
              <strong>{selectedReward.points} points</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-10 flex-1 items-center justify-center rounded-sm border border-[#cccccc] text-xs font-bold text-[#000000] hover:bg-[#f7f7f7]"
              >
                Cancel
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-10 flex-1 items-center justify-center rounded-sm bg-[#76b900] text-xs font-bold text-black hover:bg-[#5a8d00]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
