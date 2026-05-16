import { spawn, spawnSync } from "node:child_process";

const skipSatellite = process.env.SKIP_SATELLITE_PRECOMPUTE === "true";

if (!skipSatellite) {
  console.log("[satellite] precompute start");
  const result = spawnSync("python", ["ai/satellite/gee_precompute.py"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status === 0) {
    console.log("[satellite] precompute done");
  } else {
    console.warn("[satellite] precompute failed, continuing with cached data");
  }
}

const processes = [
  {
    name: "next",
    command: "next",
    args: ["dev"],
  },
  {
    name: "photo-ai",
    command: "uvicorn",
    args: ["ai.photo_ai.api:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
  },
];

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

let shuttingDown = false;

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
