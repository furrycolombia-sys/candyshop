#!/usr/bin/env node
/**
 * Manages isolated Supabase Docker stacks for different environments.
 * Each environment gets its own set of Docker containers and ports,
 * allowing multiple Supabase instances to run simultaneously without conflicts.
 *
 * The script generates a temporary config.toml from config.toml.template
 * with ports resolved from the env file, ensuring each instance is isolated.
 *
 * Usage:
 *   node scripts/supabase-docker.mjs <command> [--env <name>] [--help]
 *
 *   Commands:
 *     start    Start the Supabase stack (pulls images if needed)
 *     stop     Stop the Supabase stack
 *     restart  Stop then start
 *     reset    Reset the database (runs migrations + seed)
 *     status   Show running Supabase services and their URLs
 *
 *   Options:
 *     --env <name>   Environment to load (default: dev)
 *     --help         Print this help and exit
 *
 * Examples:
 *   pnpm supabase:docker start --env dev
 *   pnpm supabase:docker start --env staging
 *   pnpm supabase:docker stop --env dev
 *   pnpm supabase:docker reset --env dev
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const VALID_COMMANDS = ["start", "stop", "restart", "reset", "status"];

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log(`
Usage: node scripts/supabase-docker.mjs <command> [--env <name>] [--help]

  Commands:
    start    Start the Supabase stack (pulls images if needed)
    stop     Stop the Supabase stack
    restart  Stop then start
    reset    Reset the database (runs migrations + seed)
    status   Show running Supabase services and their URLs

  Options:
    --env <name>   Environment to load from .env.<name> (default: dev)
    --help         Print this help and exit

Examples:
  pnpm supabase:docker start --env dev
  pnpm supabase:docker start --env staging
  pnpm supabase:docker stop --env dev
  pnpm supabase:docker reset --env dev
`);
  process.exit(0);
}

const envFlag = args.indexOf("--env");
const targetEnv = envFlag !== -1 ? args[envFlag + 1] : "dev";

// First non-flag arg is the command
const command = args.find((a) => !a.startsWith("-") && a !== args[envFlag + 1]);

if (!command || !VALID_COMMANDS.includes(command)) {
  console.error(
    `ERROR: Unknown or missing command "${command ?? ""}". Valid commands: ${VALID_COMMANDS.join(", ")}`,
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

console.log(`\n🗄  supabase-docker`);
console.log(`   env:     ${targetEnv}`);
console.log(`   command: ${command}\n`);

// ── Generate temporary config.toml from template ──────────────────────────────

const templatePath = resolve(rootDir, "supabase/config.toml.template");
const configPath = resolve(rootDir, "supabase/config.toml");

// Default ports (used if env vars not set)
const DEFAULT_PORTS = {
  SUPABASE_API_PORT: "54321",
  SUPABASE_DB_PORT: "54322",
  SUPABASE_SHADOW_PORT: "54320",
  SUPABASE_POOLER_PORT: "54329",
  SUPABASE_STUDIO_PORT: "54323",
  SUPABASE_INBUCKET_PORT: "54324",
  SUPABASE_ANALYTICS_PORT: "54327",
  SUPABASE_INSPECTOR_PORT: "8083",
};

function generateConfig() {
  if (!existsSync(templatePath)) {
    console.error(`ERROR: Template file not found: ${templatePath}`);
    process.exit(1);
  }

  let template = readFileSync(templatePath, "utf-8");

  // Replace PROJECT_ID with environment-specific value
  const projectId = `candystore-${targetEnv}`;
  template = template.replace("{{PROJECT_ID}}", projectId);

  // Replace all {{PORT_PLACEHOLDERS}} with env values or defaults
  for (const [key, defaultValue] of Object.entries(DEFAULT_PORTS)) {
    const value = process.env[key] || defaultValue;
    template = template.replaceAll(`{{${key}}}`, value);
  }

  // Write temporary config.toml
  writeFileSync(configPath, template, "utf-8");
  
  const apiPort = process.env.SUPABASE_API_PORT || DEFAULT_PORTS.SUPABASE_API_PORT;
  const studioPort = process.env.SUPABASE_STUDIO_PORT || DEFAULT_PORTS.SUPABASE_STUDIO_PORT;
  console.log(`✓ Generated config.toml (Project: ${projectId}, API: ${apiPort}, Studio: ${studioPort})`);
}

function cleanupConfig() {
  if (existsSync(configPath)) {
    unlinkSync(configPath);
    console.log(`✓ Cleaned up temporary config.toml`);
  }
}

// Generate config before running commands
generateConfig();

// Ensure cleanup on exit
process.on("exit", cleanupConfig);
process.on("SIGINT", () => {
  cleanupConfig();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanupConfig();
  process.exit(143);
});

// ── Run supabase command(s) ───────────────────────────────────────────────────

function runSupabase(subcommand) {
  console.log(`Running: supabase ${subcommand} ...`);

  const result = spawnSync(
    isWindows ? "pnpm.cmd" : "pnpm",
    ["supabase", subcommand],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
      shell: isWindows,
    },
  );

  if (result.status !== 0) {
    console.error(
      `\nERROR: supabase ${subcommand} failed (exit ${result.status ?? "unknown"})`,
    );
    cleanupConfig();
    process.exit(result.status ?? 1);
  }

  console.log(`\n✓ supabase ${subcommand} completed`);
}

if (command === "restart") {
  // Clean up any orphaned containers before restart
  const projectId = `candystore-${targetEnv}`;
  console.log(`Cleaning up orphaned containers for ${projectId}...`);
  
  const cleanupResult = spawnSync(
    "docker",
    ["rm", "-f", ...getSupabaseContainers(projectId)],
    {
      cwd: rootDir,
      stdio: "pipe",
      env: process.env,
    },
  );
  
  if (cleanupResult.status === 0 && cleanupResult.stdout.toString().trim()) {
    console.log(`✓ Removed orphaned containers`);
  }
  
  runSupabase("stop");
  runSupabase("start");
} else {
  runSupabase(command);
}

function getSupabaseContainers(projectId) {
  const result = spawnSync(
    "docker",
    ["ps", "-a", "--filter", `label=com.supabase.cli.project=${projectId}`, "-q"],
    {
      cwd: rootDir,
      stdio: "pipe",
      env: process.env,
    },
  );
  
  if (result.status !== 0) {
    return [];
  }
  
  return result.stdout.toString().trim().split("\n").filter(Boolean);
}

// ── Print connection info after start ─────────────────────────────────────────

if (command === "start" || command === "restart") {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const studioPort = process.env.SUPABASE_STUDIO_PORT || DEFAULT_PORTS.SUPABASE_STUDIO_PORT;
  console.log(`\n   Supabase URL: ${supabaseUrl ?? "(check supabase status)"}`);
  console.log(`   Studio:       http://localhost:${studioPort}`);
}

process.exit(0);
