#!/usr/bin/env node
/**
 * E2E Docker runner — topology-driven test environment.
 *
 * Behaviour is fully determined by the env file, not the env name.
 * Three topology vars in the env file control everything:
 *
 *   APPS_MODE      local     = Vite dev servers (not supported here — use pnpm dev)
 *                  docker    = all apps in one nginx container
 *
 *   SUPABASE_MODE  local     = Supabase CLI already running (not managed here)
 *                  isolated  = isolated Supabase CLI (supabase-e2e/, port 64321)
 *                  docker    = Supabase as Docker Compose services
 *                  cloud     = Supabase Cloud — no local instance needed
 *
 *   TUNNEL_MODE    none      = localhost only
 *                  cloudflare= Cloudflare tunnel active, public URLs used
 *
 * Compose file selection (also driven by env vars):
 *   SUPABASE_MODE=isolated → docker/compose.e2e.yml
 *   SUPABASE_MODE=docker   → docker/compose.staging.yml
 *   otherwise              → docker/compose.yml
 *
 * Environment layering (handled by load-root-env.js):
 *   .env.example  →  base defaults
 *   .env.{name}   →  environment-specific overrides
 *   .secrets      →  $secret: reference resolution
 *
 * Usage:
 *   node scripts/e2e-docker.mjs                          # run all tests (default: --env e2e)
 *   node scripts/e2e-docker.mjs --env staging            # run against staging
 *   node scripts/e2e-docker.mjs --build                  # build + start only
 *   node scripts/e2e-docker.mjs --down                   # teardown
 *   node scripts/e2e-docker.mjs --rebuild                # force rebuild
 *   node scripts/e2e-docker.mjs --headed                 # visible browser
 *   node scripts/e2e-docker.mjs --ui                     # Playwright UI
 *   node scripts/e2e-docker.mjs --debug                  # Playwright inspector
 *   node scripts/e2e-docker.mjs --spec <name>            # specific spec
 *   node scripts/e2e-docker.mjs --smoke                  # smoke tests only
 *   node scripts/e2e-docker.mjs --keep-supabase          # don't stop isolated Supabase after
 */
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const docker = isWindows ? "docker.exe" : "docker";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const supabaseBin = isWindows ? "pnpm.cmd" : "pnpm";

const HEALTH_TIMEOUT_MS = 120_000;
const HEALTH_POLL_MS = 2_000;
const SUPABASE_HEALTH_TIMEOUT_MS = 90_000;

const CORE_SPECS = [
  "auth-session.spec.ts",
  "checkout-stock-integrity.spec.ts",
  "full-purchase-flow.spec.ts",
  "google-login.spec.ts",
  "mobile-layout.spec.ts",
  "permission-management.spec.ts",
  "smoke-all-apps.spec.ts",
];

// ---- Parse CLI args ----

const argList = process.argv.slice(2);
const flags = new Set(argList.filter((a) => a.startsWith("--")));

const wantsBuild = flags.has("--build");
const wantsDown = flags.has("--down");
const forceRebuild = flags.has("--rebuild");
const headed = flags.has("--headed");
const uiMode = flags.has("--ui");
const debugMode = flags.has("--debug");
const smokeOnly = flags.has("--smoke");
const keepSupabase = flags.has("--keep-supabase");

function getArgValue(name) {
  const idx = argList.indexOf(name);
  return idx !== -1 && argList[idx + 1] ? argList[idx + 1] : null;
}

const envName = getArgValue("--env") || "e2e";
const specFile = getArgValue("--spec");

// ---- Env loading ----
// Must happen BEFORE reading topology vars.

loadRootEnv({ targetEnv: envName });

// ---- Topology — read from env file, not from env name ----

const appsMode = process.env.APPS_MODE || "docker";
const supabaseMode = process.env.SUPABASE_MODE || "local";
const tunnelMode = process.env.TUNNEL_MODE || "none";

// This script only handles Docker-based app deployments.
// Local Vite dev servers are managed by `pnpm dev` / `pnpm dev:up`.
if (appsMode !== "docker") {
  console.error(
    `[e2e-docker:${envName}] APPS_MODE="${appsMode}" — this script only runs Docker-based environments.`,
  );
  console.error(`  For local dev servers, use: pnpm dev`);
  process.exit(1);
}

// Validate TUNNEL_MODE has required config when active.
if (tunnelMode === "cloudflare" && !process.env.CLOUDFLARE_TUNNEL_TOKEN) {
  console.error(
    `[e2e-docker:${envName}] TUNNEL_MODE=cloudflare but CLOUDFLARE_TUNNEL_TOKEN is not set.`,
  );
  console.error(`  Add CLOUDFLARE_TUNNEL_TOKEN=$secret:YOUR_KEY to .env.${envName} or .secrets.`);
  process.exit(1);
}

// ---- Compose file selection (driven by SUPABASE_MODE) ----

function resolveComposeFile() {
  if (supabaseMode === "isolated") return resolve(rootDir, "docker", "compose.e2e.yml");
  if (supabaseMode === "docker") return resolve(rootDir, "docker", "compose.staging.yml");
  return resolve(rootDir, "docker", "compose.yml");
}

const composeFile = resolveComposeFile();

const containerName = process.env.SITE_PROD_CONTAINER_NAME || `candyshop-${envName}`;
const imageName = process.env.SITE_PROD_IMAGE_NAME || `candyshop-${envName}`;
const port = process.env.SITE_PROD_PORT || "8089";
const baseUrl = `http://localhost:${port}`;
const projectName = `candyshop-${envName}`;

// ---- Helpers ----

function log(msg) {
  console.log(`[e2e-docker:${envName}] ${msg}`);
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    ...opts,
  });
  return result.status ?? 0;
}

function runSilent(cmd, cmdArgs, opts = {}) {
  return spawnSync(cmd, cmdArgs, {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
    ...opts,
  });
}

const needsCloudflareProfile = tunnelMode === "cloudflare" && !!process.env.CLOUDFLARE_TUNNEL_TOKEN;

function compose(...cmdArgs) {
  const baseArgs = ["compose", "-p", projectName, "-f", composeFile];
  if (needsCloudflareProfile) {
    baseArgs.push("--profile", "cloudflare");
  }
  return run(docker, [...baseArgs, ...cmdArgs]);
}

function isContainerRunning() {
  const result = runSilent(docker, ["ps", "-q", "-f", `name=${containerName}`]);
  return (result.stdout || "").trim().length > 0;
}

function imageExistsLocally() {
  const result = runSilent(docker, ["images", "-q", imageName]);
  return (result.stdout || "").trim().length > 0;
}

// ---- Supabase lifecycle (isolated mode only) ----
// SUPABASE_MODE=isolated: a separate Supabase CLI instance in supabase-e2e/
// with its own project_id, ports, and DB volume — never collides with dev.

function isIsolatedSupabaseRunning() {
  const result = runSilent(docker, [
    "ps", "-q", "-f", "name=supabase_db_supabase-e2e",
  ]);
  return (result.stdout || "").trim().length > 0;
}

function startIsolatedSupabase() {
  log("Starting isolated Supabase (project: candystore-e2e, port 64321)...");
  runSilent(docker, ["rm", "-f", "supabase_vector_candystore-e2e"]);
  const code = run(supabaseBin, ["supabase", "start", "--workdir", "supabase-e2e"]);
  if (code !== 0) {
    log("Failed to start isolated Supabase.");
    process.exit(code);
  }
}

function stopIsolatedSupabase() {
  log("Stopping isolated Supabase...");
  run(supabaseBin, ["supabase", "stop", "--workdir", "supabase-e2e", "--no-backup"]);
  runSilent(docker, ["rm", "-f", "supabase_vector_candystore-e2e"]);
}

async function waitForSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabasePort = (() => {
    try { return new URL(supabaseUrl).port || "54321"; } catch { return "54321"; }
  })();
  const url = `http://127.0.0.1:${supabasePort}/rest/v1/`;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const start = Date.now();
  log(`Waiting for Supabase at ${url}...`);
  while (Date.now() - start < SUPABASE_HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch(url, { headers: { apikey: key } });
      if (res.ok) {
        log(`Supabase ready after ${Math.round((Date.now() - start) / 1000)}s.`);
        return true;
      }
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  log("Supabase did not become ready in time.");
  return false;
}

// ---- Container lifecycle ----

async function waitForHealth() {
  const url = `${baseUrl}/health`;
  const start = Date.now();
  log(`Waiting for ${url}...`);
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        log(`Healthy after ${Math.round((Date.now() - start) / 1000)}s.`);
        return true;
      }
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  log(`Container did not become healthy within ${HEALTH_TIMEOUT_MS / 1000}s.`);
  return false;
}

function teardownContainer() {
  log("Tearing down container...");
  compose("down", "--remove-orphans");
}

function buildAndStart() {
  log("Stopping any existing container...");
  compose("down", "--remove-orphans");
  if (forceRebuild) {
    log("Building Docker image from scratch (no cache)...");
    const buildCode = compose("build", "--no-cache", "--pull");
    if (buildCode !== 0) {
      log("Failed to build image.");
      process.exit(buildCode);
    }
  } else {
    log("Building Docker image...");
  }
  const upArgs = ["up", "-d"];
  if (!forceRebuild) upArgs.push("--build");
  const code = compose(...upArgs);
  if (code !== 0) {
    log("Failed to start container.");
    process.exit(code);
  }
}

function startExisting() {
  log("Starting container from existing image...");
  const code = compose("up", "-d", "--build", "--force-recreate");
  if (code !== 0) {
    log("Failed to start container.");
    process.exit(code);
  }
}

async function ensureContainerReady() {
  if (isContainerRunning()) {
    log("Container already running.");
    const healthy = await waitForHealth();
    if (healthy) return;
    log("Container unhealthy, rebuilding...");
  }
  if (!forceRebuild && imageExistsLocally()) {
    startExisting();
  } else {
    buildAndStart();
  }
  const healthy = await waitForHealth();
  if (!healthy) {
    log("Container logs:");
    compose("logs", "--tail=40");
    teardownContainer();
    process.exit(1);
  }
}

// ---- Supabase setup (isolated mode) ----

async function ensureIsolatedSupabaseReady() {
  if (isIsolatedSupabaseRunning()) {
    log("Isolated Supabase already running.");
  } else {
    startIsolatedSupabase();
  }
  const ready = await waitForSupabase();
  if (!ready) {
    log("Supabase failed to start. Aborting.");
    process.exit(1);
  }
}

// ---- Tests ----

function runTests() {
  const playwrightArgs = ["--filter", "auth-app", "exec", "playwright", "test"];

  if (smokeOnly) {
    playwrightArgs.push("smoke-all-apps.spec.ts");
  } else if (specFile) {
    playwrightArgs.push(specFile.replace(/^e2e\//, ""));
  } else {
    for (const spec of CORE_SPECS) playwrightArgs.push(spec);
  }

  if (headed) playwrightArgs.push("--headed");
  if (uiMode) playwrightArgs.push("--ui");
  if (debugMode) playwrightArgs.push("--debug");
  playwrightArgs.push("--reporter=list");

  const modeLabel = uiMode ? "UI mode" : debugMode ? "debug mode" : headed ? "headed" : "headless";
  log(`Running Playwright (${modeLabel}) against ${baseUrl}`);
  if (smokeOnly) log("Smoke tests only");
  else if (specFile) log(`Spec: ${specFile}`);
  else log(`${CORE_SPECS.length} spec files`);

  // E2E_PUBLIC_ORIGIN tells Playwright where the app is reachable from the browser.
  // For tunnel mode, use the public origin. Otherwise use the local container URL.
  const e2ePublicOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim() || baseUrl;

  return new Promise((resolvePromise) => {
    const child = spawn(pnpm, playwrightArgs, {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        TARGET_ENV: envName,
        E2E_PUBLIC_ORIGIN: e2ePublicOrigin,
        PLAYWRIGHT_USE_EXISTING_STACK: "true",
        ...(debugMode ? { PWDEBUG: "1" } : {}),
      },
    });
    child.on("close", (code) => resolvePromise(code ?? 0));
    child.on("error", () => resolvePromise(1));
  });
}

// ---- Main ----

log(`Environment: .env.${envName} | APPS_MODE=${appsMode} SUPABASE_MODE=${supabaseMode} TUNNEL_MODE=${tunnelMode} -> ${baseUrl}`);

if (wantsDown) {
  teardownContainer();
  if (supabaseMode === "isolated" && !keepSupabase) {
    stopIsolatedSupabase();
  }
  log("Done.");
  process.exit(0);
}

if (wantsBuild) {
  if (supabaseMode === "isolated") {
    await ensureIsolatedSupabaseReady();
  }
  buildAndStart();
  const healthy = await waitForHealth();
  if (!healthy) {
    log("Container logs:");
    compose("logs", "--tail=40");
    teardownContainer();
    process.exit(1);
  }
  log("");
  log(`Stack ready at ${baseUrl}`);
  if (supabaseMode === "isolated") {
    log(`Supabase: http://localhost:64321 (isolated, project: candystore-e2e)`);
  }
  log("");
  log("Commands:");
  log("  pnpm test:e2e                    Run all tests headless");
  log("  pnpm test:e2e:headed             Run all tests in browser");
  log("  pnpm test:e2e:ui                 Open Playwright UI");
  log("  pnpm test:e2e:debug              Run with Playwright inspector");
  log("  pnpm test:e2e -- --spec <name>   Run specific spec");
  log("  pnpm test:e2e -- --smoke         Smoke tests only");
  log("  pnpm test:e2e:down               Tear down stack");
  process.exit(0);
}

// Full cycle: Supabase (if needed) → container → tests → teardown
if (supabaseMode === "isolated") {
  await ensureIsolatedSupabaseReady();
}
await ensureContainerReady();

const testExitCode = await runTests();

if (headed || uiMode || debugMode) {
  log(`Container still running at ${baseUrl}. Tear down with: pnpm test:e2e:down`);
} else {
  teardownContainer();
  if (supabaseMode === "isolated" && !keepSupabase) {
    stopIsolatedSupabase();
  }
  log("Done.");
}

process.exit(testExitCode);
