import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");
const {
  resolveAuthHostUrl,
  resolvePublicAppUrls,
} = require("./app-url-resolver.js");

process.env.TARGET_ENV = "staging";
loadRootEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

// Select compose file based on SUPABASE_MODE (same logic as e2e-docker.mjs)
const supabaseMode = process.env.SUPABASE_MODE || "local";
const composeFile =
  supabaseMode === "isolated"
    ? resolve(rootDir, "docker", "compose.e2e.yml")
    : supabaseMode === "docker"
      ? resolve(rootDir, "docker", "compose.staging.yml")
      : resolve(rootDir, "docker", "compose.yml");
const dockerBin = isWindows ? "docker.exe" : "docker";

const args = new Set(process.argv.slice(2));
// --cloudflare is kept as a CLI override to force tunnel on regardless of TUNNEL_MODE.
// If TUNNEL_MODE=cloudflare in the env file, the tunnel starts automatically.
const wantsCloudflare = args.has("--cloudflare") || process.env.TUNNEL_MODE === "cloudflare";
const wantsStop = args.has("--stop");
const skipBuild = args.has("--no-build");
const wantsFresh = args.has("--fresh");
const wantsHelp = args.has("--help") || args.has("-h");

const imageName =
  process.env.SITE_PROD_IMAGE_NAME?.trim() || "candyshop-local-prod";
const port = process.env.SITE_PROD_PORT?.trim() || "8088";
const localBaseUrl = `http://localhost:${port}`;

function log(message) {
  console.log(`[site-prod] ${message}`);
}

function fail(message) {
  console.error(`[site-prod] ${message}`);
  process.exit(1);
}

function commandExists(command) {
  const shell = isWindows ? "where" : "which";
  const result = spawnSync(shell, [command], { stdio: "ignore" });
  return result.status === 0;
}

function ensureRequiredCommand(command, installHint) {
  if (commandExists(command)) return;
  fail(
    `\`${command}\` is not installed or not available in PATH. ${installHint}`,
  );
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });
}

function isLocalhostUrl(value) {
  if (!value) return false;

  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function hasCloudflareConfig() {
  return Boolean(
    process.env.CLOUDFLARED_ARGS?.trim() ||
    process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim() ||
    process.env.CLOUDFLARE_TUNNEL_NAME?.trim(),
  );
}

function buildComposeArgs(commandArgs) {
  return ["compose", "-p", "candyshop-prod", "-f", composeFile, ...commandArgs];
}

async function waitForHealth(url) {
  const maxWaitMs = 90_000;
  const pollIntervalMs = 2_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Stack is still starting.
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, pollIntervalMs);
    });
  }

  fail(`Stack did not become healthy at ${url} within 90s.`);
}

if (wantsHelp) {
  console.log(`Usage:
  pnpm staging
  pnpm staging:tunnel
  pnpm staging:stop

Options:
  --cloudflare  Start the Docker staging stack plus the Cloudflare sidecar
  --no-build    Reuse the existing Docker image instead of rebuilding it
  --fresh       Rebuild with --no-cache --pull always (fully fresh image)
  --stop        Stop and remove the Docker staging stack

Environment:
  SITE_PROD_PORT=8088
  SITE_PROD_CONTAINER_NAME=candyshop-staging
  SITE_PROD_IMAGE_NAME=candyshop-staging
  SITE_PUBLIC_ORIGIN=https://store.ffxivbe.org

Cloudflare:
  CLOUDFLARE_TUNNEL_TOKEN=...
  CLOUDFLARE_TUNNEL_NAME=...
  CLOUDFLARED_ARGS="tunnel run my-tunnel"

Notes:
  - This command runs the Dockerized staging stack via Docker Compose.
  - If you expose the site publicly, set SITE_PUBLIC_ORIGIN or explicit NEXT_PUBLIC_* app URLs.
  - If AUTH_PROVIDER_MODE=supabase, NEXT_PUBLIC_SUPABASE_URL must also be public.`);
  process.exit(0);
}

ensureRequiredCommand(
  dockerBin,
  "Install Docker Desktop and make sure it is running.",
);

const resolvedAppUrls = resolvePublicAppUrls();
const publicUrls = {
  NEXT_PUBLIC_LANDING_URL: resolvedAppUrls.landing,
  NEXT_PUBLIC_STORE_URL: resolvedAppUrls.store,
  NEXT_PUBLIC_ADMIN_URL: resolvedAppUrls.admin,
  NEXT_PUBLIC_PLAYGROUND_URL: resolvedAppUrls.playground,
  NEXT_PUBLIC_PAYMENTS_URL: resolvedAppUrls.payments,
  NEXT_PUBLIC_STUDIO_URL: resolvedAppUrls.studio,
  NEXT_PUBLIC_AUTH_URL: resolvedAppUrls.auth,
  NEXT_PUBLIC_AUTH_HOST_URL: resolveAuthHostUrl("public"),
};
const publicUrlEntries = Object.entries(publicUrls);

if (wantsCloudflare) {
  const missingPublicUrls = publicUrlEntries
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingPublicUrls.length > 0) {
    fail(
      `Missing public app URLs for Cloudflare startup: ${missingPublicUrls.join(", ")}. Set SITE_PUBLIC_ORIGIN or explicit NEXT_PUBLIC_* URLs in .env.`,
    );
  }

  const localhostPublicUrls = publicUrlEntries
    .filter(([, value]) => isLocalhostUrl(value))
    .map(([key, value]) => `${key}=${value}`);

  if (localhostPublicUrls.length > 0) {
    fail(
      `Cloudflare startup requires public app URLs, but these still point to localhost: ${localhostPublicUrls.join(", ")}.`,
    );
  }

  if (
    process.env.AUTH_PROVIDER_MODE === "supabase" &&
    isLocalhostUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ) {
    fail(
      "AUTH_PROVIDER_MODE=supabase requires NEXT_PUBLIC_SUPABASE_URL to be publicly reachable when using Cloudflare.",
    );
  }

  if (!hasCloudflareConfig()) {
    fail(
      "Cloudflare startup requires CLOUDFLARED_ARGS, CLOUDFLARE_TUNNEL_TOKEN, or CLOUDFLARE_TUNNEL_NAME.",
    );
  }
}

if (wantsStop) {
  log("Stopping Docker production stack...");
  run(dockerBin, buildComposeArgs(["down", "--remove-orphans"]));
  // Force-remove the named container in case compose left it behind
  // (e.g. created but never fully started — causes "name already in use" on next run).
  const containerName = process.env.SITE_PROD_CONTAINER_NAME?.trim() || "candyshop-staging";
  const rmResult = spawnSync(dockerBin, ["rm", "-f", containerName], {
    cwd: rootDir,
    encoding: "utf8",
    env: process.env,
  });
  if (rmResult.status === 0 && rmResult.stdout?.trim()) {
    log(`Removed leftover container: ${containerName}`);
  }
  log("Done.");
  process.exit(0);
}

const buildArgEnvKeys = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_BUILD_HASH",
  "NEXT_PUBLIC_ENABLE_TEST_IDS",
  "NEXT_PUBLIC_PROJECT_ID",
  "NEXT_PUBLIC_TENANT",
  "AUTH_PROVIDER_MODE",
  "NEXT_PUBLIC_KEYCLOAK_URL",
  "NEXT_PUBLIC_KEYCLOAK_REALM",
  "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SITE_PUBLIC_ORIGIN",
  "BASE_PATH_PREFIX",
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_STORE_URL",
  "NEXT_PUBLIC_PAYMENTS_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PLAYGROUND_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_HOST_URL",
];

const resolvedEnv = { ...publicUrls };
const publicOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim();
const publicUrlKeys = new Set([
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_STORE_URL",
  "NEXT_PUBLIC_PAYMENTS_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PLAYGROUND_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_HOST_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_KEYCLOAK_URL",
]);

for (const key of buildArgEnvKeys) {
  if (process.env[key] !== undefined) {
    if (
      publicOrigin &&
      publicUrlKeys.has(key) &&
      isLocalhostUrl(process.env[key])
    ) {
      continue;
    }

    resolvedEnv[key] = process.env[key];
  }
}

Object.assign(process.env, resolvedEnv);

log("Replacing existing Docker production stack if needed...");
run(dockerBin, buildComposeArgs(["down", "--remove-orphans"]));

const composeUpArgs = [];
if (wantsCloudflare) {
  composeUpArgs.push("--profile", "cloudflare");
}

composeUpArgs.push("up", "-d");

if (!skipBuild) {
  composeUpArgs.push("--build");
  if (wantsFresh) {
    composeUpArgs.push("--no-cache", "--pull", "always");
    log(`Building Docker image \`${imageName}\` (fresh, no cache)...`);
  } else {
    log(`Building Docker image \`${imageName}\`...`);
  }
} else {
  log(`Reusing existing Docker image \`${imageName}\`.`);
}

log(`Starting Docker production stack on ${localBaseUrl}...`);
const composeResult = runCapture(dockerBin, buildComposeArgs(composeUpArgs));
if (composeResult.status !== 0) {
  process.stderr.write(composeResult.stderr || "");
  process.exit(composeResult.status ?? 1);
}

await waitForHealth(`${localBaseUrl}/health`);

log("Docker stack is healthy.");
log(`Landing:   ${localBaseUrl}`);
log(`Store:     ${localBaseUrl}/store`);
log(`Admin:     ${localBaseUrl}/admin`);
log(`Payments:  ${localBaseUrl}/payments`);
log(`Studio:    ${localBaseUrl}/studio`);
log(`Auth:      ${localBaseUrl}/auth`);
log(`Health:    ${localBaseUrl}/health`);

if (wantsCloudflare) {
  log("Cloudflare sidecar is running inside the Docker Compose stack.");
}

log("Stop it with: pnpm staging:stop");
