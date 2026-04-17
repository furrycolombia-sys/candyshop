#!/usr/bin/env node
/**
 * E2E test runner.
 *
 * dev     — starts supabase + pnpm dev, waits for apps, runs Playwright.
 *           If apps are already running, skips starting them.
 * staging — runs docker-build.mjs --up --tunnel, waits, runs Playwright.
 *
 * Usage:
 *   node scripts/e2e.mjs [--env <dev|staging>] [--app <auth|store>] [--headed] [--ui] [--help]
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
Usage: node scripts/e2e.mjs [--env <name>] [--app <app>] [--headed] [--ui]

  --env <name>   dev | staging  (default: dev)
  --app <app>    auth | store   (default: auth)
  --headed       Headed browser
  --ui           Playwright UI mode
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "dev";

const appFlag = args.indexOf("--app");
const targetApp = appFlag !== -1 ? args[appFlag + 1] : "auth";

const headed = args.includes("--headed");
const ui = args.includes("--ui");

if (!["dev", "staging"].includes(targetEnv)) {
  console.error("ERROR: --env must be dev or staging"); process.exit(1);
}
if (!["auth", "store"].includes(targetApp)) {
  console.error("ERROR: --app must be auth or store"); process.exit(1);
}

loadEnv(targetEnv);

console.log(`\n🧪 e2e  env=${targetEnv}  app=${targetApp}\n`);

// ── Dev ───────────────────────────────────────────────────────────────────────

let devProc = null;

if (targetEnv === "dev") {
  // 1. Supabase — use supabase:docker so config.toml is generated from the
  //    template with OAuth providers (Google, Discord) properly configured.
  console.log("▶ supabase:docker start --env dev");
  spawnSync("pnpm", ["supabase:docker", "start", "--env", "dev"], {
    cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
  });

  // 2. Start dev servers if not already up
  const port = portForApp(targetApp);
  const alreadyUp = await checkPort(port);

  if (alreadyUp) {
    console.log(`✓ Dev servers already running (${targetApp} on :${port})\n`);
  } else {
    console.log(`\n▶ pnpm dev`);
    devProc = spawn("pnpm", ["dev"], {
      cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
    });
    console.log(`   Waiting for ${targetApp} on :${port}...`);
    await waitForPort(port, 120_000);
    console.log(`✓ ${targetApp} ready\n`);
  }
}

// ── Staging ───────────────────────────────────────────────────────────────────

if (targetEnv === "staging") {
  // 0. Stop any existing tunnel first
  console.log("▶ tunnel:stop --env staging");
  spawnSync("pnpm", ["tunnel:stop", "--env", "staging"], {
    cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
  });

  // 1. Start Supabase Docker stack for staging
  console.log("▶ supabase:docker start --env staging");
  const supaResult = spawnSync("pnpm", ["supabase:docker", "start", "--env", "staging"], {
    cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
  });
  if (supaResult.status !== 0) process.exit(supaResult.status ?? 1);

  // 2. Build + start app container
  console.log("\n▶ docker:build --env staging --up");
  const buildResult = spawnSync("pnpm", ["docker:build", "--env", "staging", "--up"], {
    cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
  });
  if (buildResult.status !== 0) process.exit(buildResult.status ?? 1);

  // 3. Launch Cloudflare tunnel
  console.log("\n▶ tunnel --env staging");
  const tunnelResult = spawnSync("pnpm", ["tunnel", "--env", "staging"], {
    cwd: rootDir, stdio: "inherit", env: process.env, shell: true,
  });
  if (tunnelResult.status !== 0) process.exit(tunnelResult.status ?? 1);

  // Wait for the local container port to be ready
  const port = Number.parseInt(process.env.HOST_PORT ?? "", 10) || 7542;
  console.log(`\n   Waiting for staging app on :${port}...`);
  await waitForPort(port, 120_000);
  console.log("✓ Staging app ready\n");
}

// ── Playwright ────────────────────────────────────────────────────────────────

const configPath = resolve(rootDir, `apps/${targetApp}/playwright.config.ts`);
if (!existsSync(configPath)) {
  console.error(`ERROR: No playwright config at ${configPath}`);
  process.exit(1);
}

const pwArgs = ["exec", "playwright", "test", "--config", configPath, "--max-failures=1"];
if (headed) pwArgs.push("--headed");
if (ui) pwArgs.push("--ui");

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
  try { return Number.parseInt(new URL(process.env[key]).port, 10); } catch { /* fall through */ }
  return { auth: 5000, store: 5001 }[app] ?? 5000;
}

async function checkPort(port) {
  const { createConnection } = await import("node:net");
  return new Promise((res) => {
    const s = createConnection({ port, host: "127.0.0.1" });
    s.once("connect", () => { s.destroy(); res(true); });
    s.once("error", () => { s.destroy(); res(false); });
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
