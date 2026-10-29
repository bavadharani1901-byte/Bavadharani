import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load .env.local so drizzle-kit can read DATABASE_URL
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : "require",
  },
});
