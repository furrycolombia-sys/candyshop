#!/usr/bin/env node
/**
 * Stops and removes the candyshop Docker container and image for a given env.
 *
 * Usage:
 *   node scripts/docker-teardown.mjs [--env <name>] [--help]
 *
 *   --env <name>   Environment to load (default: prod)
 *   --help         Print this help and exit
 *
 * Examples:
 *   pnpm docker:teardown --env staging
 *   pnpm docker:teardown --env prod
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
Usage: node scripts/docker-teardown.mjs [--env <name>] [--help]

  --env <name>   Environment to load from .env.<name> (default: prod)
  --help         Print this help and exit

What it does:
  1. Stops and removes the container (docker compose down)
  2. Removes the built image (docker rmi)

Examples:
  pnpm docker:teardown --env staging
  pnpm docker:teardown --env prod
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "prod";

// ── Load env file ─────────────────────────────────────────────────────────────

try {
  loadEnv(targetEnv);
} catch (err) {
  console.error(`ERROR: Failed to load .env.${targetEnv}: ${err.message}`);
  process.exit(1);
}

const imageName = process.env.SITE_PROD_IMAGE_NAME;
const containerName = process.env.SITE_PROD_CONTAINER_NAME;

if (!imageName) {
  console.error("ERROR: SITE_PROD_IMAGE_NAME is not set in the env file.");
  process.exit(1);
}

if (!containerName) {
  console.error("ERROR: SITE_PROD_CONTAINER_NAME is not set in the env file.");
  process.exit(1);
}

console.log(`\n🗑  docker-teardown`);
console.log(`   env:       ${targetEnv}`);
console.log(`   image:     ${imageName}`);
console.log(`   container: ${containerName}\n`);

// ── Step 1: docker compose down (stops + removes container) ──────────────────

console.log(`Stopping and removing container: ${containerName} ...`);

const downResult = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    "docker/compose.yml",
    "down",
    "--remove-orphans",
  ],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      SITE_PROD_IMAGE_NAME: imageName,
      SITE_PROD_CONTAINER_NAME: containerName,
    },
  },
);

if (downResult.status !== 0) {
  // Non-zero here usually means the container wasn't running — not fatal.
  console.warn(
    `  ⚠ docker compose down exited with ${downResult.status ?? "unknown"} (container may not have been running)`,
  );
}

// ── Step 2: docker rmi (removes the image) ────────────────────────────────────

console.log(`\nRemoving image: ${imageName} ...`);

const rmiResult = spawnSync("docker", ["rmi", imageName], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

if (rmiResult.status !== 0) {
  // Non-zero here usually means the image didn't exist — not fatal.
  console.warn(
    `  ⚠ docker rmi exited with ${rmiResult.status ?? "unknown"} (image may not exist)`,
  );
}

console.log(`\n✓ Teardown complete for env: ${targetEnv}`);
process.exit(0);
