import * as schema from "./schema";

// Detect Cloudflare Workers environment (no TCP sockets → use Neon HTTP driver)
const isEdge =
  typeof globalThis !== "undefined" &&
  // Workers set navigator.userAgent to "Cloudflare-Workers"
  (globalThis as any).navigator?.userAgent === "Cloudflare-Workers";

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (isEdge || url.includes("neon.tech")) {
    // Neon serverless HTTP driver — works in Cloudflare Workers & Edge
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require("@neondatabase/serverless");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/neon-http");
    const sql = neon(url);
    return drizzle(sql, { schema });
  }

  // Standard node-postgres driver — works in Node.js dev server
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/node-postgres");
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}

export const db = (() => {
  if (!_db) _db = createDb();
  return _db;
})();
