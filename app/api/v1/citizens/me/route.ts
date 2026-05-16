import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateCitizenByUserId } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const citizen = getOrCreateCitizenByUserId(
    session.user.id,
    session.user.name || "Citizen",
  );

  return NextResponse.json({ citizen });
}
