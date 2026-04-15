#!/usr/bin/env node
/**
 * E2E Docker runner — fully isolated test environment.
 *
 * Manages the ENTIRE stack:
 *   1. Starts the isolated e2e Supabase (port 64321, project: candystore-e2e)
 *      — runs alongside the dev Supabase, no restart needed
 *   2. Builds and starts the Next.js Docker container
 *   3. Runs Playwright tests
 *   4. Tears down the e2e container
 *   5. Stops the e2e Supabase instance
 *
 * The e2e Supabase uses its own config (supabase-e2e/config.toml) with
 * hardcoded auth URLs and a separate project_id so Docker container names
 * never collide with the dev instance.
 *
 * Environment layering (handled by load-root-env.js):
 *   .env.example  ->  base defaults
 *   .env.{name}   ->  environment-specific overrides
 *   .secrets      ->  $secret: reference resolution
 *
 * Usage:
 *   node scripts/e2e-docker.mjs                          # run all tests
 *   node scripts/e2e-docker.mjs --build                  # build + start only
 *   node scripts/e2e-docker.mjs --down                   # teardown
 *   node scripts/e2e-docker.mjs --rebuild                # force rebuild
 *   node scripts/e2e-docker.mjs --headed                 # visible browser
 *   node scripts/e2e-docker.mjs --ui                     # Playwright UI
 *   node scripts/e2e-docker.mjs --debug                  # Playwright inspector
 *   node scripts/e2e-docker.mjs --spec <name>            # specific spec
 *   node scripts/e2e-docker.mjs --smoke                  # smoke tests only
 *   node scripts/e2e-docker.mjs --env staging            # use .env.staging
 *   node scripts/e2e-docker.mjs --keep-supabase          # don't stop e2e Supabase after
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
const composeFile = resolve(
  rootDir,
  "docker",
  envName === "e2e" ? "compose.e2e.yml" : "compose.yml",
);

// ---- Env loading (via load-root-env.js) ----

loadRootEnv({ targetEnv: envName });

const containerName =
  process.env.SITE_PROD_CONTAINER_NAME || `candyshop-${envName}`;
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
  // On Windows, spawnSync may return null for status on success
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

// Staging uses the cloudflare profile to start the tunnel sidecar
const needsCloudflare = envName === "staging" && !!process.env.CLOUDFLARE_TUNNEL_TOKEN;

function compose(...cmdArgs) {
  const baseArgs = [
    "compose",
    "-p",
    projectName,
    "-f",
    composeFile,
  ];
  if (needsCloudflare) {
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

// ---- Supabase lifecycle ----
// The e2e Supabase uses a separate workdir (supabase-e2e/) with its own
// config.toml (Google OAuth redirect to localhost, site_url to localhost:8089).
// It uses the same ports as dev (54321) but a different project ID
// (candystore-e2e) so the database volume is isolated.
// The script stops the dev Supabase before starting the e2e one.

function isDevSupabaseRunning() {
  const result = runSilent(docker, [
    "ps",
    "-q",
    "-f",
    "name=supabase_db_candystore",
  ]);
  // Filter out e2e containers
  const ids = (result.stdout || "").trim();
  if (!ids) return false;
  // Check if any non-e2e supabase containers are running
  const check = runSilent(docker, [
    "ps",
    "--format",
    "{{.Names}}",
    "-f",
    "name=supabase_db_candystore",
  ]);
  return (
    (check.stdout || "").includes("supabase_db_candystore\n") ||
    ((check.stdout || "").includes("supabase_db_candystore") &&
      !(check.stdout || "").includes("supabase_db_candystore-e2e"))
  );
}

function isE2ESupabaseRunning() {
  const result = runSilent(docker, [
    "ps",
    "-q",
    "-f",
    "name=supabase_db_supabase-e2e",
  ]);
  return (result.stdout || "").trim().length > 0;
}

function stopDevSupabase() {
  log("Stopping dev Supabase...");
  run(supabaseBin, ["supabase", "stop", "--no-backup"]);
  // Clean up stuck containers
  runSilent(docker, ["rm", "-f", "supabase_vector_candystore"]);
}

function startE2ESupabase() {
  log("Starting e2e Supabase (project: candystore-e2e)...");
  // Clean up any stuck containers from previous runs
  runSilent(docker, ["rm", "-f", "supabase_vector_candystore-e2e"]);
  const code = run(supabaseBin, [
    "supabase",
    "start",
    "--workdir",
    "supabase-e2e",
  ]);
  if (code !== 0) {
    log("Failed to start e2e Supabase.");
    process.exit(code);
  }
}

function stopE2ESupabase() {
  log("Stopping e2e Supabase...");
  run(supabaseBin, [
    "supabase",
    "stop",
    "--workdir",
    "supabase-e2e",
    "--no-backup",
  ]);
  // Clean up stuck vector container (uses project_id from config.toml)
  runSilent(docker, ["rm", "-f", "supabase_vector_candystore-e2e"]);
}

function restoreDevSupabase() {
  log("Restoring dev Supabase...");
  run(supabaseBin, ["supabase", "start"]);
}

async function waitForSupabase() {
  const supabasePort = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).port || "54321"
    : "54321";
  const url = `http://127.0.0.1:${supabasePort}/rest/v1/`;
  const start = Date.now();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  log("Waiting for Supabase...");
  while (Date.now() - start < SUPABASE_HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch(url, { headers: { apikey: key } });
      if (res.ok) {
        log(
          `Supabase ready after ${Math.round((Date.now() - start) / 1000)}s.`,
        );
        return true;
      }
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  log("Supabase did not become ready in time.");
  return false;
}

// ---- Container lifecycle ----

async function waitForHealth() {
  const url = `${baseUrl}/health`;
  const start = Date.now();
  log(`Waiting for ${url} ...`);
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        log(`Healthy after ${Math.round((Date.now() - start) / 1000)}s.`);
        return true;
      }
    } catch {
      /* not ready */
    }
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

// ---- Supabase setup ----

async function ensureSupabaseReady() {
  if (isE2ESupabaseRunning()) {
    log("E2E Supabase already running.");
  } else {
    startE2ESupabase();
  }
  const ready = await waitForSupabase();
  if (!ready) {
    log("Supabase failed to start. Aborting.");
    process.exit(1);
  }
}

// ---- Full teardown ----

function fullTeardown() {
  teardownContainer();
  if (!keepSupabase) {
    stopE2ESupabase();
  } else {
    log("E2E Supabase left running (--keep-supabase).");
  }
  log("Done.");
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

  const modeLabel = uiMode
    ? "UI mode"
    : debugMode
      ? "debug mode"
      : headed
        ? "headed"
        : "headless";
  log(`Running Playwright (${modeLabel}) against ${baseUrl}`);
  if (smokeOnly) log("Smoke tests only");
  else if (specFile) log(`Spec: ${specFile}`);
  else log(`${CORE_SPECS.length} spec files`);

  // For staging, the container is built with the public URL baked in.
  // OAuth callbacks redirect to the public domain, not localhost.
  // Use SITE_PUBLIC_ORIGIN if set (staging), otherwise fall back to baseUrl.
  const e2ePublicOrigin =
    process.env.SITE_PUBLIC_ORIGIN?.trim() || baseUrl;

  return new Promise((resolvePromise) => {
    const child = spawn(pnpm, playwrightArgs, {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
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

// Only the e2e environment needs its own isolated Supabase instance.
// Staging and other envs use the main local Supabase (already running).
const needsE2ESupabase = envName === "e2e";

log(`Environment: .env.${envName} -> ${baseUrl}`);

if (wantsDown) {
  teardownContainer();
  if (needsE2ESupabase && !keepSupabase) {
    stopE2ESupabase();
  }
  log("Done.");
  process.exit(0);
}

if (wantsBuild) {
  if (needsE2ESupabase) {
    await ensureSupabaseReady();
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
  log(`E2E stack ready at ${baseUrl}`);
  log(
    `Supabase: http://localhost:54321 (e2e instance, project: candystore-e2e)`,
  );
  log("");
  log("Commands:");
  log("  pnpm test:e2e                    Run all tests headless");
  log("  pnpm test:e2e:headed             Run all tests in browser");
  log("  pnpm test:e2e:ui                 Open Playwright UI");
  log("  pnpm test:e2e:debug              Run with Playwright inspector");
  log("  pnpm test:e2e -- --spec <name>   Run specific spec");
  log("  pnpm test:e2e -- --smoke         Smoke tests only");
  log("  pnpm test:e2e:down               Tear down e2e stack");
  process.exit(0);
}

// Full cycle: Supabase -> container -> tests -> teardown -> restore
if (needsE2ESupabase) {
  await ensureSupabaseReady();
}
await ensureContainerReady();

const testExitCode = await runTests();

if (headed || uiMode || debugMode) {
  log(
    `Container still running at ${baseUrl}. Tear down with: pnpm test:e2e:down`,
  );
} else {
  teardownContainer();
  if (needsE2ESupabase && !keepSupabase) {
    stopE2ESupabase();
  }
  log("Done.");
}

process.exit(testExitCode);
