#!/usr/bin/env node
/**
 * Builds the candyshop Docker image for any named environment and optionally
 * starts the container via docker compose.
 *
 * Usage:
 *   node scripts/docker-build.mjs [--env <name>] [--no-cache] [--up] [--tunnel] [--help]
 *
 *   --env <name>   Environment to load (default: prod)
 *   --no-cache     Pass --no-cache to docker build
 *   --up           Run docker compose up -d after a successful build
 *   --tunnel       Launch Cloudflare tunnels after docker compose up (requires --up)
 *   --help         Print this help and exit
 *
 * Examples:
 *   pnpm docker:build --env staging
 *   pnpm docker:build --env prod --no-cache --up
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
Usage: node scripts/docker-build.mjs [--env <name>] [--no-cache] [--up] [--tunnel] [--help]

  --env <name>   Environment to load from .env.<name> (default: prod)
  --no-cache     Pass --no-cache to docker build (forces a clean build)
  --up           Run docker compose up -d after a successful build
  --tunnel       Launch Cloudflare tunnels after docker compose up (requires --up)
  --help         Print this help and exit

Examples:
  pnpm docker:build --env staging
  pnpm docker:build --env prod --no-cache --up
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "prod";
const noCache = args.includes("--no-cache");
const up = args.includes("--up");
const tunnel = args.includes("--tunnel");

if (tunnel && !up) {
  console.error(
    "ERROR: --tunnel requires --up. Use: pnpm docker:build --up --tunnel",
  );
  process.exit(1);
}

// ── Load env file ─────────────────────────────────────────────────────────────

try {
  loadEnv(targetEnv);
} catch (err) {
  console.error(`ERROR: Failed to load .env.${targetEnv}: ${err.message}`);
  process.exit(1);
}

// ── Resolve required values from env ─────────────────────────────────────────

const imageName = process.env.SITE_PROD_IMAGE_NAME;
const containerName = process.env.SITE_PROD_CONTAINER_NAME;

if (!imageName) {
  console.error(
    "ERROR: SITE_PROD_IMAGE_NAME is not set in the env file. Cannot determine image name.",
  );
  process.exit(1);
}

if (!containerName) {
  console.error(
    "ERROR: SITE_PROD_CONTAINER_NAME is not set in the env file. Cannot determine container name.",
  );
  process.exit(1);
}

const hostPort = Number.parseInt(process.env.HOST_PORT ?? "", 10);
if (Number.isNaN(hostPort)) {
  console.error(
    "ERROR: HOST_PORT is not set to a valid number in the env file.",
  );
  process.exit(1);
}

// ── Build args — all sourced from process.env ─────────────────────────────────

const BUILD_ARG_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_AUTH_URL",
  "NEXT_PUBLIC_AUTH_HOST_URL",
  "NEXT_PUBLIC_STORE_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PLAYGROUND_URL",
  "NEXT_PUBLIC_LANDING_URL",
  "NEXT_PUBLIC_PAYMENTS_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_BUILD_HASH",
  "NEXT_PUBLIC_ENABLE_TEST_IDS",
  "NEXT_PUBLIC_ENV_DEBUG",
];

const buildArgFlags = BUILD_ARG_KEYS.flatMap((key) => [
  "--build-arg",
  `${key}=${process.env[key] ?? ""}`,
]);

// ── Print summary ─────────────────────────────────────────────────────────────

console.log(`\n🐳 docker-build`);
console.log(`   env:       ${targetEnv}`);
console.log(`   image:     ${imageName}`);
console.log(`   container: ${containerName}`);
console.log(`   host port: ${hostPort}`);
console.log(`   no-cache:  ${noCache}`);
console.log(`   up:        ${up}`);
console.log(`   tunnel:    ${tunnel}\n`);

// ── docker build ──────────────────────────────────────────────────────────────

const buildArgs = [
  "build",
  "-f",
  "docker/smoke/Dockerfile",
  "-t",
  imageName,
  ...buildArgFlags,
  ...(noCache ? ["--no-cache"] : []),
  ".",
];

console.log(`Building image: ${imageName} ...`);

const buildResult = spawnSync("docker", buildArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

if (buildResult.status !== 0) {
  console.error(
    `\nERROR: docker build failed (exit ${buildResult.status ?? "unknown"})`,
  );
  process.exit(buildResult.status ?? 1);
}

console.log(`\n✓ Image built successfully: ${imageName}`);

// ── docker compose up (optional) ─────────────────────────────────────────────

if (up) {
  console.log(`\nStarting container via docker compose ...`);

  // Remove any existing container with the same name first.
  // This handles containers started outside of compose context.
  const rmResult = spawnSync("docker", ["rm", "-f", containerName], {
    cwd: rootDir,
    stdio: "pipe",
    env: process.env,
  });
  if (rmResult.status === 0) {
    console.log(`  Removed existing container: ${containerName}`);
  }

  const composeArgs = [
    "compose",
    "-f",
    "docker/compose.yml",
    "up",
    "-d",
    "--remove-orphans",
  ];

  // Pass resolved env vars directly via process.env rather than --env-file,
  // which would re-parse the raw file and expose unresolved $secret: refs.
  const composeResult = spawnSync("docker", composeArgs, {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      SITE_PROD_IMAGE_NAME: imageName,
      SITE_PROD_CONTAINER_NAME: containerName,
      HOST_PORT: String(hostPort),
    },
  });

  if (composeResult.status !== 0) {
    console.error(
      `\nERROR: docker compose up failed (exit ${composeResult.status ?? "unknown"})`,
    );
    process.exit(composeResult.status ?? 1);
  }

  console.log(`\n✓ Container is running: ${containerName} (port ${hostPort})`);
  console.log(`   → http://localhost:${hostPort}`);

  if (tunnel) {
    console.log(`\nLaunching Cloudflare tunnels ...`);
    const tunnelResult = spawnSync(
      "node",
      ["scripts/cloudflared.mjs", "--env", targetEnv],
      {
        cwd: rootDir,
        stdio: "inherit",
        env: process.env,
      },
    );
    if (tunnelResult.status !== 0) {
      process.exit(tunnelResult.status ?? 1);
    }
  }
}

process.exit(0);
