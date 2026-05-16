import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  const citizens = getLeaderboard(Math.min(limit, 100));
  return NextResponse.json({ leaderboard: citizens });
}
