import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadRootEnv } = require("./load-root-env.js");

loadRootEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const dockerBin = isWindows ? "docker.exe" : "docker";
const defaultCloudflaredBin = process.env.CLOUDFLARED_BIN?.trim()
  ? process.env.CLOUDFLARED_BIN.trim()
  : isWindows
    ? "cloudflared.exe"
    : "cloudflared";

const args = new Set(process.argv.slice(2));
const wantsCloudflare = args.has("--cloudflare");
const wantsStop = args.has("--stop");
const skipBuild = args.has("--no-build");
const wantsHelp = args.has("--help") || args.has("-h");

const containerName =
  process.env.SITE_PROD_CONTAINER_NAME?.trim() || "candyshop-prod";
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

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl, path = "") {
  if (!path) return baseUrl;
  return `${trimTrailingSlash(baseUrl)}${path}`;
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

function resolvePublicUrls() {
  const publicOrigin = process.env.SITE_PUBLIC_ORIGIN?.trim()
    ? trimTrailingSlash(process.env.SITE_PUBLIC_ORIGIN.trim())
    : "";

  return {
    NEXT_PUBLIC_LANDING_URL:
      process.env.NEXT_PUBLIC_LANDING_URL?.trim() || publicOrigin,
    NEXT_PUBLIC_STORE_URL:
      process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/store") : ""),
    NEXT_PUBLIC_ADMIN_URL:
      process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/admin") : ""),
    NEXT_PUBLIC_PLAYGROUND_URL:
      process.env.NEXT_PUBLIC_PLAYGROUND_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/playground") : ""),
    NEXT_PUBLIC_PAYMENTS_URL:
      process.env.NEXT_PUBLIC_PAYMENTS_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/payments") : ""),
    NEXT_PUBLIC_STUDIO_URL:
      process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/studio") : ""),
    NEXT_PUBLIC_AUTH_URL:
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/auth") : ""),
    NEXT_PUBLIC_AUTH_HOST_URL:
      process.env.NEXT_PUBLIC_AUTH_HOST_URL?.trim() ||
      (publicOrigin ? joinUrl(publicOrigin, "/auth") : ""),
  };
}

function getCloudflareCommand() {
  const rawArgs = process.env.CLOUDFLARED_ARGS?.trim();
  if (rawArgs) {
    return {
      command: defaultCloudflaredBin,
      args: rawArgs.split(/\s+/),
      description: `${defaultCloudflaredBin} ${rawArgs}`,
    };
  }

  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN?.trim();
  if (token) {
    return {
      command: defaultCloudflaredBin,
      args: ["tunnel", "run", "--token", token],
      description: `${defaultCloudflaredBin} tunnel run --token *****`,
    };
  }

  const tunnelName = process.env.CLOUDFLARE_TUNNEL_NAME?.trim();
  if (tunnelName) {
    return {
      command: defaultCloudflaredBin,
      args: ["tunnel", "run", tunnelName],
      description: `${defaultCloudflaredBin} tunnel run ${tunnelName}`,
    };
  }

  return null;
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
      // Container still starting.
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, pollIntervalMs);
    });
  }

  fail(`Container did not become healthy at ${url} within 90s.`);
}

if (wantsHelp) {
  console.log(`Usage:
  pnpm site:prod
  pnpm site:prod:cloudflare
  pnpm site:prod:stop

Options:
  --cloudflare  Build/start the local production container, then run cloudflared
  --no-build    Reuse the existing Docker image instead of rebuilding it
  --stop        Stop and remove the local production container

Environment:
  SITE_PROD_PORT=8088
  SITE_PROD_CONTAINER_NAME=candyshop-prod
  SITE_PROD_IMAGE_NAME=candyshop-local-prod
  SITE_PUBLIC_ORIGIN=https://shop.example.com

Cloudflare:
  CLOUDFLARED_BIN=cloudflared
  CLOUDFLARE_TUNNEL_TOKEN=...
  CLOUDFLARE_TUNNEL_NAME=...
  CLOUDFLARED_ARGS="tunnel run my-tunnel"

Notes:
  - This command runs the Dockerized production build, not \`pnpm dev\`.
  - If you expose the site publicly, set SITE_PUBLIC_ORIGIN or explicit NEXT_PUBLIC_* app URLs.
  - If AUTH_PROVIDER_MODE=supabase, NEXT_PUBLIC_SUPABASE_URL must also be public.`);
  process.exit(0);
}

ensureRequiredCommand(
  dockerBin,
  "Install Docker Desktop and make sure it is running.",
);

if (wantsStop) {
  log(`Stopping container \`${containerName}\` if it exists...`);
  spawnSync(dockerBin, ["rm", "-f", containerName], {
    cwd: rootDir,
    stdio: "ignore",
    env: process.env,
  });
  log("Done.");
  process.exit(0);
}

if (wantsCloudflare) {
  ensureRequiredCommand(
    defaultCloudflaredBin,
    "Install Cloudflare Tunnel first or set CLOUDFLARED_BIN.",
  );
}

const publicUrls = resolvePublicUrls();
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
  "BASE_PATH_PREFIX",
];

const runtimeEnvKeys = [
  ...buildArgEnvKeys,
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_STORE_URL",
  "NEXT_PUBLIC_PAYMENTS_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PLAYGROUND_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_HOST_URL",
];

const resolvedEnv = {
  ...publicUrls,
};

for (const key of buildArgEnvKeys) {
  if (process.env[key] !== undefined) {
    resolvedEnv[key] = process.env[key];
  }
}

if (!skipBuild) {
  log(`Building Docker image \`${imageName}\`...`);
  const buildArgs = ["build", "-t", imageName];

  for (const key of [...buildArgEnvKeys, ...Object.keys(publicUrls)]) {
    const value = resolvedEnv[key];
    if (value !== undefined && value !== "") {
      buildArgs.push("--build-arg", `${key}=${value}`);
    }
  }

  buildArgs.push(".");
  run(dockerBin, buildArgs);
} else {
  log(`Reusing existing Docker image \`${imageName}\`.`);
}

log(`Replacing container \`${containerName}\` if it already exists...`);
spawnSync(dockerBin, ["rm", "-f", containerName], {
  cwd: rootDir,
  stdio: "ignore",
  env: process.env,
});

log(`Starting production container on ${localBaseUrl}...`);
const runArgs = [
  "run",
  "-d",
  "--restart",
  "unless-stopped",
  "--name",
  containerName,
  "-p",
  `${port}:80`,
];

for (const key of runtimeEnvKeys) {
  const value = resolvedEnv[key];
  if (value !== undefined && value !== "") {
    runArgs.push("-e", `${key}=${value}`);
  }
}

runArgs.push(imageName);
const runResult = runCapture(dockerBin, runArgs);

if (runResult.status !== 0) {
  process.stderr.write(runResult.stderr || "");
  process.exit(runResult.status ?? 1);
}

await waitForHealth(`${localBaseUrl}/health`);

log(`Container is healthy.`);
log(`Landing:   ${localBaseUrl}`);
log(`Store:     ${localBaseUrl}/store`);
log(`Admin:     ${localBaseUrl}/admin`);
log(`Payments:  ${localBaseUrl}/payments`);
log(`Studio:    ${localBaseUrl}/studio`);
log(`Auth:      ${localBaseUrl}/auth`);
log(`Health:    ${localBaseUrl}/health`);

if (!wantsCloudflare) {
  log(`Stop it with: pnpm site:prod:stop`);
  process.exit(0);
}

const cloudflareCommand = getCloudflareCommand();
if (!cloudflareCommand) {
  fail(
    "Cloudflare requested but no tunnel config was found. Set CLOUDFLARED_ARGS, CLOUDFLARE_TUNNEL_TOKEN, or CLOUDFLARE_TUNNEL_NAME.",
  );
}

log(`Starting Cloudflare tunnel: ${cloudflareCommand.description}`);
log(`The production container will keep running if this tunnel process stops.`);

const cloudflareChild = spawn(
  cloudflareCommand.command,
  cloudflareCommand.args,
  {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  },
);

cloudflareChild.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
