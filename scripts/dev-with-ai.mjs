import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const skipSatellite = process.env.SKIP_SATELLITE_PRECOMPUTE === "true";
const skipOsm = process.env.SKIP_OSM_PRECOMPUTE === "true";
const satelliteCachePath = "data/seed_satellite_readings.json";
const osmCachePath = "data/seed_osm_sources.json";

function hasJsonArrayCache(path) {
  if (!existsSync(path)) return false;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

if (skipSatellite) {
  console.log("[satellite] precompute skipped by env");
} else if (hasJsonArrayCache(satelliteCachePath)) {
  console.log("[satellite] cached data found, skip precompute");
} else {
  console.log("[satellite] precompute start");
  const result = spawnSync("python", ["ai/satellite/gee_precompute.py"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) console.warn("[satellite] precompute failed, continuing");
}

if (skipOsm) {
  console.log("[osm] precompute skipped by env");
} else if (hasJsonArrayCache(osmCachePath)) {
  console.log("[osm] cached data found, skip precompute");
} else {
  console.log("[osm] precompute start");
  const result = spawnSync("python", ["ai/osm/overpass_precompute.py"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) console.warn("[osm] precompute failed, continuing");
}

const processes = [
  { name: "next", command: "bunx", args: ["next", "dev"] },
  {
    name: "photo-ai",
    command: "python",
    args: ["-m", "uvicorn", "ai.photo_ai.api:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
  },
];

let shuttingDown = false;
const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] exited`, signal ?? code);
    shutdown(code ?? 1);
  });
  return child;
});

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
