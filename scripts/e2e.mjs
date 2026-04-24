#!/usr/bin/env node
/**
 * E2E test runner.
 *
 * Topology is driven by env variables, not by the env name:
 *   APPS_MODE=local    → pnpm dev (starts dev servers)
 *   APPS_MODE=docker   → docker:build --up
 *   SUPABASE_MODE=docker              → supabase:docker start
 *   CLOUDFLARE_TUNNEL_APP_ENABLED=true → tunnel start/stop
 *
 * Usage:
 *   node scripts/e2e.mjs [--env <name>] [--app <auth|store|admin>] [--headed] [--ui] [--help]
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
Usage: node scripts/e2e.mjs [--env <name>] [--app <app>] [--headed] [--ui] [-- <playwright args>]

  --env <name>   Environment to load from .env.<name> (default: dev)
  --app <app>    auth | store | admin   (default: auth)
  --headed       Headed browser
  --ui           Playwright UI mode
  --             Everything after -- is forwarded to Playwright as-is

Examples:
  node scripts/e2e.mjs --env staging -- --grep "turns payments"
  node scripts/e2e.mjs --env staging -- apps/auth/e2e/permission-management.spec.ts:267
  node scripts/e2e.mjs --env dev -- --grep "login" --headed
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "dev";

const appFlag = args.indexOf("--app");
const targetApp = appFlag !== -1 ? args[appFlag + 1] : "auth";

const headed = args.includes("--headed");
const ui = args.includes("--ui");

// Everything after -- is forwarded verbatim to Playwright
const separatorIdx = args.indexOf("--");
const passthroughArgs = separatorIdx !== -1 ? args.slice(separatorIdx + 1) : [];

if (!["auth", "store", "admin"].includes(targetApp)) {
  console.error("ERROR: --app must be auth, store, or admin");
  process.exit(1);
}

loadEnv(targetEnv);

console.log(`\n🧪 e2e  env=${targetEnv}  app=${targetApp}\n`);

// ── Infrastructure ────────────────────────────────────────────────────────────

const appsMode = process.env.APPS_MODE ?? "local";
const supabaseMode = process.env.SUPABASE_MODE ?? "cloud";
const tunnelEnabled = process.env.CLOUDFLARE_TUNNEL_APP_ENABLED === "true";

let devProc = null;

// 1. Stop any running tunnel before touching infrastructure
if (tunnelEnabled) {
  console.log(`▶ tunnel:stop --env ${targetEnv}`);
  spawnSync("pnpm", ["tunnel:stop", "--env", targetEnv], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

// 2. Start Supabase if using local Docker
if (supabaseMode === "docker") {
  console.log(`▶ supabase:docker start --env ${targetEnv}`);
  const result = spawnSync(
    "pnpm",
    ["supabase:docker", "start", "--env", targetEnv],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: true,
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
} else {
  console.log("✓ Using Supabase Cloud — skipping local Supabase start\n");
}

// 3. Start the app
if (appsMode === "docker") {
  console.log(`\n▶ docker:build --env ${targetEnv} --up`);
  const result = spawnSync(
    "pnpm",
    ["docker:build", "--env", targetEnv, "--up"],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: true,
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);

  const port = Number.parseInt(process.env.HOST_PORT ?? "", 10);
  if (!Number.isNaN(port) && port > 0) {
    console.log(`\n   Waiting for app on :${port}...`);
    await waitForPort(port, 120_000);
    console.log("✓ App ready\n");
  }
} else {
  // local mode — start dev servers if not already up
  const port = portForApp(targetApp);
  const alreadyUp = await checkPort(port);

  if (alreadyUp) {
    console.log(`✓ Dev servers already running (${targetApp} on :${port})\n`);
  } else {
    console.log(`\n▶ pnpm dev`);
    devProc = spawn("pnpm", ["dev"], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    console.log(`   Waiting for ${targetApp} on :${port}...`);
    await waitForPort(port, 120_000);
    console.log(`✓ ${targetApp} ready\n`);
  }
}

// 4. Launch tunnel if enabled
if (tunnelEnabled) {
  console.log(`\n▶ tunnel --env ${targetEnv}`);
  const result = spawnSync("pnpm", ["tunnel", "--env", targetEnv], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// ── Playwright ────────────────────────────────────────────────────────────────

const appDir = resolve(rootDir, `apps/${targetApp}`);
const configPath = resolve(appDir, "playwright.config.ts");
if (!existsSync(configPath)) {
  console.error(`ERROR: No playwright config at ${configPath}`);
  process.exit(1);
}

const pwArgs = [
  "--dir",
  appDir,
  "exec",
  "playwright",
  "test",
  "--config",
  "playwright.config.ts",
  "--max-failures=1",
];
if (headed) pwArgs.push("--headed");
if (ui) pwArgs.push("--ui");
// Quote args that contain spaces so shell: true doesn't break them into tokens
if (passthroughArgs.length) {
  pwArgs.push(...passthroughArgs.map((a) => (a.includes(" ") ? `"${a}"` : a)));
}

console.log(`▶ playwright test  app=${targetApp}  env=${targetEnv}\n`);

const pw = spawn("pnpm", pwArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, TARGET_ENV: targetEnv },
  shell: true,
});

pw.on("exit", (code) => {
  if (devProc) devProc.kill("SIGTERM");
  process.exit(code ?? 0);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function portForApp(app) {
  const key = `NEXT_PUBLIC_${app.toUpperCase()}_URL`;
  try {
    return Number.parseInt(new URL(process.env[key]).port, 10);
  } catch {
    /* fall through */
  }
  return { auth: 5000, store: 5001, admin: 5002 }[app] ?? 5000;
}

async function checkPort(port) {
  const { createConnection } = await import("node:net");
  return new Promise((res) => {
    const s = createConnection({ port, host: "127.0.0.1" });
    s.once("connect", () => {
      s.destroy();
      res(true);
    });
    s.once("error", () => {
      s.destroy();
      res(false);
    });
  });
}

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkPort(port)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`ERROR: port ${port} not ready after ${timeoutMs}ms`);
  process.exit(1);
}
