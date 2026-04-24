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

/**
 * Derive all Supabase service ports from a single base port.
 * Convention matches Supabase CLI defaults (base = API port):
 *   base+0 → API
 *   base+1 → DB
 *   base-1 → shadow DB
 *   base+8 → pooler
 *   base+2 → Studio
 *   base+3 → Inbucket
 *   base+6 → Analytics
 *   inspector → base + 10000 - 21 (keeps the 8083/18083 pattern)
 */
function derivePorts(base) {
  return {
    SUPABASE_API_PORT: String(base),
    SUPABASE_DB_PORT: String(base + 1),
    SUPABASE_SHADOW_PORT: String(base - 1),
    SUPABASE_POOLER_PORT: String(base + 8),
    SUPABASE_STUDIO_PORT: String(base + 2),
    SUPABASE_INBUCKET_PORT: String(base + 3),
    SUPABASE_ANALYTICS_PORT: String(base + 6),
    SUPABASE_INSPECTOR_PORT: String(base + 10000 - 21), // 54321→8300, 64321→18300
  };
}

function generateConfig() {
  if (!existsSync(templatePath)) {
    console.error(`ERROR: Template file not found: ${templatePath}`);
    process.exit(1);
  }

  const basePort = parseInt(process.env.SUPABASE_PORT ?? "54321", 10);
  if (isNaN(basePort)) {
    console.error(
      `ERROR: SUPABASE_PORT is not a valid number: ${process.env.SUPABASE_PORT}`,
    );
    process.exit(1);
  }

  const ports = derivePorts(basePort);

  // Expose derived ports back onto process.env so downstream code can read them
  for (const [key, value] of Object.entries(ports)) {
    process.env[key] = value;
  }

  // Derive redirect URLs from the app origin vars already in process.env
  const redirectUrls = {
    SUPABASE_AUTH_REDIRECT_URL_AUTH: `${process.env.NEXT_PUBLIC_AUTH_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_STORE: `${process.env.NEXT_PUBLIC_STORE_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_ADMIN: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_PAYMENTS: `${process.env.NEXT_PUBLIC_PAYMENTS_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_PLAYGROUND: `${process.env.NEXT_PUBLIC_PLAYGROUND_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_LANDING: `${process.env.NEXT_PUBLIC_LANDING_URL ?? ""}/auth/callback`,
    SUPABASE_AUTH_REDIRECT_URL_STUDIO: `${process.env.NEXT_PUBLIC_STUDIO_URL ?? ""}/auth/callback`,
  };
  for (const [key, value] of Object.entries(redirectUrls)) {
    process.env[key] = value;
  }

  let template = readFileSync(templatePath, "utf-8");

  const projectId = `candystore-${targetEnv}`;
  template = template.replace("{{PROJECT_ID}}", projectId);

  for (const [key, value] of Object.entries(ports)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }

  // Disable the edge runtime in CI — no edge functions exist in this project,
  // and the container's health check reliably times out due to ECR rate limiting.
  const edgeRuntimeEnabled =
    process.env.SUPABASE_EDGE_RUNTIME_ENABLED ?? (process.env.CI ? "false" : "true");
  template = template.replaceAll("{{SUPABASE_EDGE_RUNTIME_ENABLED}}", edgeRuntimeEnabled);

  writeFileSync(configPath, template, "utf-8");
  console.log(
    `✓ Generated config.toml (Project: ${projectId}, API: ${ports.SUPABASE_API_PORT}, Studio: ${ports.SUPABASE_STUDIO_PORT})`,
  );
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
  const commandArgs =
    subcommand === "reset" ? ["supabase", "db", "reset"] : ["supabase", subcommand];

  const result = spawnSync(
    isWindows ? "pnpm.cmd" : "pnpm",
    commandArgs,
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

if (command === "restart" || command === "start") {
  // Clean up any orphaned containers before start/restart
  const projectId = `candystore-${targetEnv}`;
  const orphans = getSupabaseContainers(projectId);
  if (orphans.length > 0) {
    console.log(
      `Cleaning up ${orphans.length} orphaned container(s) for ${projectId}...`,
    );
    spawnSync("docker", ["rm", "-f", ...orphans], {
      cwd: rootDir,
      stdio: "pipe",
      env: process.env,
    });
    console.log(`✓ Removed orphaned containers`);
  }

  if (command === "restart") {
    runSupabase("stop");
  }
  runSupabase("start");
} else {
  runSupabase(command);
}

function getSupabaseContainers(projectId) {
  const result = spawnSync(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      `label=com.supabase.cli.project=${projectId}`,
      "-q",
    ],
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
  const studioPort = process.env.SUPABASE_STUDIO_PORT;
  console.log(`\n   Supabase URL: ${supabaseUrl ?? "(check supabase status)"}`);
  console.log(`   Studio:       http://localhost:${studioPort}`);
}

process.exit(0);
