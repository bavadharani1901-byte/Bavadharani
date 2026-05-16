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
  const accounts = [
    { email: "ngo@wave.local", password: "ngo", role: "NGO", displayName: "NGO User" },
    { email: "gov@wave.local", password: "gov", role: "GOVERNMENT", displayName: "Government User" },
    { email: "userx@wave.local", password: "userX", role: "PUBLIC", displayName: "User X" },
    { email: "usery@wave.local", password: "userY", role: "PUBLIC", displayName: "User Y" },
  ];

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    await db
      .insert(users)
      .values({
        email: account.email,
        passwordHash,
        role: account.role,
        displayName: account.displayName,
      })
      .onConflictDoNothing({ target: users.email });
    console.log(`Seeded: ${account.email} (${account.role})`);
  }

  console.log("\nSeed complete. You can now log in with:");
  console.log("  NGO        → ngo@wave.local / ngo");
  console.log("  Government → gov@wave.local / gov");
  console.log("  Public X   → userx@wave.local / userX");
  console.log("  Public Y   → usery@wave.local / userY");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
