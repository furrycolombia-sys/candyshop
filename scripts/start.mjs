#!/usr/bin/env node
// Starts all apps in dev mode via Turborepo.
// Loads .env.dev (with $secret: resolution) before starting.
// Ports are derived from NEXT_PUBLIC_*_URL env vars so each env file controls them.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const envFlag = process.argv.indexOf("--env");
const targetEnv = envFlag !== -1 ? process.argv[envFlag + 1] : "dev";
loadEnv(targetEnv);

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// Auto-discover all apps and derive their port from NEXT_PUBLIC_<APP>_URL env vars
import { readdirSync, rmSync, existsSync } from "node:fs";

const appsDir = resolve(rootDir, "apps");
const appNames = readdirSync(appsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

// Clear .next cache for all apps to avoid stale env var mismatches
for (const app of appNames) {
  const cache = resolve(appsDir, app, ".next");
  if (existsSync(cache)) {
    rmSync(cache, { recursive: true, force: true });
  }
}

// Extract port from a URL string, e.g. "http://localhost:7001" → "7001"
function portFrom(url) {
  if (!url) return null;
  try {
    return new URL(url).port || null;
  } catch {
    return null;
  }
}

// Match app name to env var: "auth" → NEXT_PUBLIC_AUTH_URL, "app-components" → NEXT_PUBLIC_APP_COMPONENTS_URL
function portForApp(name) {
  const key = `NEXT_PUBLIC_${name.toUpperCase().replace(/-/g, "_")}_URL`;
  return portFrom(process.env[key]);
}

const children = appNames.map((app) => {
  const appDir = resolve(rootDir, "apps", app); // nosemgrep: AIK_ts_generic_path_traversal
  const rawPort = portForApp(app);
  // Parse as integer to sanitize: only a pure number reaches spawn args,
  // breaking the taint chain from the directory name through portForApp.
  const portNumber = parseInt(rawPort ?? "", 10);
  const safePort =
    !Number.isNaN(portNumber) && portNumber > 0 && portNumber <= 65535
      ? String(portNumber)
      : null;
  // pnpm hoists binaries to the workspace root — not to each app's node_modules/.bin/
  const nextBin = resolve(
    rootDir,
    "node_modules",
    ".bin",
    isWindows ? "next.CMD" : "next",
  );
  const args = ["dev", ...(safePort ? ["-p", safePort] : [])];

  // On Windows, .CMD files cannot be spawned directly without shell:true.
  // Invoke cmd.exe explicitly with a fixed argument list to avoid shell injection.
  return isWindows
    ? spawn("cmd.exe", ["/d", "/s", "/c", nextBin, ...args], {
        cwd: appDir,
        stdio: "inherit",
        env: process.env,
      })
    : spawn(nextBin, args, { cwd: appDir, stdio: "inherit", env: process.env });
});

children.forEach((child) => {
  child.on("exit", (code) => {
    if (code !== null && code !== 0) process.exit(code);
  });
});
