import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function seed() {
  const now = new Date("2026-05-17T00:00:00.000Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86400000);

  const accounts = [
    {
      email: "ngo@wave.local",
      password: "ngo",
      role: "NGO",
      displayName: "NGO User",
      createdAt: daysAgo(92),
    },
    {
      email: "gov@wave.local",
      password: "gov",
      role: "GOVERNMENT",
      displayName: "Government User",
      createdAt: daysAgo(88),
    },
    {
      email: "userx@wave.local",
      password: "userX",
      role: "PUBLIC",
      displayName: "User X",
      createdAt: daysAgo(74),
    },
    {
      email: "usery@wave.local",
      password: "userY",
      role: "PUBLIC",
      displayName: "User Y",
      createdAt: daysAgo(59),
    },
    {
      email: "citizen.a@wave.local",
      password: "citizenA",
      role: "PUBLIC",
      displayName: "Citizen A",
      createdAt: daysAgo(43),
    },
    {
      email: "citizen.b@wave.local",
      password: "citizenB",
      role: "PUBLIC",
      displayName: "Citizen B",
      createdAt: daysAgo(31),
    },
    {
      email: "citizen.c@wave.local",
      password: "citizenC",
      role: "PUBLIC",
      displayName: "Citizen C",
      createdAt: daysAgo(17),
    },
    {
      email: "citizen.d@wave.local",
      password: "citizenD",
      role: "PUBLIC",
      displayName: "Citizen D",
      createdAt: daysAgo(6),
    },
  ] as const;

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    await db
      .insert(users)
      .values({
        email: account.email,
        passwordHash,
        role: account.role,
        displayName: account.displayName,
        createdAt: account.createdAt,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash,
          role: account.role,
          displayName: account.displayName,
          createdAt: account.createdAt,
        },
      });

    console.log(
      `Seeded: ${account.email} (${account.role}) @ ${account.createdAt
        .toISOString()
        .slice(0, 10)}`,
    );
  }

  console.log("\nSeed complete. You can now log in with:");
  console.log("  NGO        -> ngo@wave.local / ngo");
  console.log("  Government -> gov@wave.local / gov");
  console.log("  Public X   -> userx@wave.local / userX");
  console.log("  Public Y   -> usery@wave.local / userY");
  console.log("  Citizen A  -> citizen.a@wave.local / citizenA");
  console.log("  Citizen B  -> citizen.b@wave.local / citizenB");
  console.log("  Citizen C  -> citizen.c@wave.local / citizenC");
  console.log("  Citizen D  -> citizen.d@wave.local / citizenD");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
