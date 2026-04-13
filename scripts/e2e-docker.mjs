#!/usr/bin/env node
/**
 * E2E Docker runner — builds and runs an isolated e2e container, executes
 * Playwright tests against it, then optionally tears it down.
 *
 * All e2e tests run exclusively against a Docker container to prevent
 * fake data from leaking into the production environment.
 *
 * Environment layering:
 *   .env  ->  base values (production)
 *   .env.{name}  ->  overrides for the target environment
 *
 * The --env flag selects which overlay to use (default: "e2e").
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
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const composeFile = resolve(rootDir, "docker", "compose.e2e.yml");
const isWindows = process.platform === "win32";
const docker = isWindows ? "docker.exe" : "docker";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";

const HEALTH_TIMEOUT_MS = 120_000;
const HEALTH_POLL_MS = 2_000;

// Specs that work with injected sessions against the Docker container.
// OAuth login specs (google-login, discord-login) are excluded because
// they require real provider credentials and production callback URLs.
const CORE_SPECS = [
  "auth-session.spec.ts",
  "checkout-stock-integrity.spec.ts",
  "full-purchase-flow.spec.ts",
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

function getArgValue(name) {
  const idx = argList.indexOf(name);
  return idx !== -1 && argList[idx + 1] ? argList[idx + 1] : null;
}

const envName = getArgValue("--env") || "e2e";
const specFile = getArgValue("--spec");

// ---- Env loading ----

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const vars = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const baseEnvFile = resolve(rootDir, ".env");
const overlayEnvFile = resolve(rootDir, `.env.${envName}`);

if (!existsSync(overlayEnvFile)) {
  console.error(`[e2e-docker] Missing env file: .env.${envName}`);
  console.error(`[e2e-docker] Create it or use --env <name> to pick another.`);
  process.exit(1);
}

const baseEnv = parseEnvFile(baseEnvFile);
const overlayEnv = parseEnvFile(overlayEnvFile);
const mergedEnv = { ...process.env, ...baseEnv, ...overlayEnv };

const containerName = mergedEnv.SITE_PROD_CONTAINER_NAME || `candyshop-${envName}`;
const imageName = mergedEnv.SITE_PROD_IMAGE_NAME || `candyshop-${envName}`;
const port = mergedEnv.SITE_PROD_PORT || "8089";
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
    env: mergedEnv,
    ...opts,
  });
  return result.status ?? 1;
}

function compose(...cmdArgs) {
  return run(docker, [
    "compose", "-p", projectName, "-f", composeFile, ...cmdArgs,
  ]);
}

function isContainerRunning() {
  const result = spawnSync(docker, ["ps", "-q", "-f", `name=${containerName}`], {
    cwd: rootDir, encoding: "utf8",
  });
  return (result.stdout || "").trim().length > 0;
}

function imageExistsLocally() {
  const result = spawnSync(docker, ["images", "-q", imageName], {
    cwd: rootDir, encoding: "utf8",
  });
  return (result.stdout || "").trim().length > 0;
}

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
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  log(`Container did not become healthy within ${HEALTH_TIMEOUT_MS / 1000}s.`);
  return false;
}

function teardown() {
  log("Tearing down container...");
  compose("down", "--remove-orphans");
  log("Done.");
}

function buildAndStart() {
  log("Stopping any existing container...");
  compose("down", "--remove-orphans");
  if (forceRebuild) {
    log("Building Docker image from scratch (no cache)...");
    const buildCode = compose("build", "--no-cache", "--pull");
    if (buildCode !== 0) { log("Failed to build image."); process.exit(buildCode); }
  } else {
    log("Building Docker image...");
  }
  const upArgs = ["up", "-d"];
  if (!forceRebuild) upArgs.push("--build");
  const code = compose(...upArgs);
  if (code !== 0) { log("Failed to start container."); process.exit(code); }
}

function startExisting() {
  log("Starting container from existing image...");
  const code = compose("up", "-d");
  if (code !== 0) { log("Failed to start container."); process.exit(code); }
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
    log("Container logs:"); compose("logs", "--tail=40");
    teardown(); process.exit(1);
  }
}

function runTests() {
  const playwrightArgs = ["--filter", "auth-app", "exec", "playwright", "test"];

  if (smokeOnly) {
    playwrightArgs.push("smoke-all-apps.spec.ts");
  } else if (specFile) {
    playwrightArgs.push(specFile.replace(/^e2e\//, ""));
  } else {
    // Run only core specs (excludes OAuth login tests)
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
  else log(`Core specs: ${CORE_SPECS.length} files (OAuth specs excluded)`);

  return run(pnpm, playwrightArgs, {
    env: {
      ...mergedEnv,
      E2E_PUBLIC_ORIGIN: baseUrl,
      PLAYWRIGHT_USE_EXISTING_STACK: "true",
      ...(debugMode ? { PWDEBUG: "1" } : {}),
    },
  });
}

// ---- Main ----

log(`Environment: .env.${envName} -> ${baseUrl}`);

if (wantsDown) { teardown(); process.exit(0); }

if (wantsBuild) {
  buildAndStart();
  const healthy = await waitForHealth();
  if (!healthy) { log("Container logs:"); compose("logs", "--tail=40"); teardown(); process.exit(1); }
  log("");
  log(`Container ready at ${baseUrl}`);
  log("");
  log("Commands:");
  log("  pnpm test:e2e                    Run all core tests headless");
  log("  pnpm test:e2e:headed             Run all core tests in browser");
  log("  pnpm test:e2e:ui                 Open Playwright UI");
  log("  pnpm test:e2e:debug              Run with Playwright inspector");
  log("  pnpm test:e2e -- --spec <name>   Run specific spec");
  log("  pnpm test:e2e -- --smoke         Smoke tests only");
  log("  pnpm test:e2e:down               Tear down container");
  process.exit(0);
}

await ensureContainerReady();
const testExitCode = runTests();

if (headed || uiMode || debugMode) {
  log(`Container still running at ${baseUrl}. Tear down with: pnpm test:e2e:down`);
} else {
  teardown();
}
process.exit(testExitCode);
