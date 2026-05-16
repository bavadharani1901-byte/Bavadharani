import CitizenLeaderboard from "@/components/citizen/citizen-leaderboard";
import CitizenNav from "@/components/citizen/citizen-nav";

export default function LeaderboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      <CitizenNav />
      <CitizenLeaderboard />
    </div>
  );
}
