#!/usr/bin/env node
/**
 * Launches all enabled Cloudflare tunnels declared in the active env file.
 *
 * Usage:
 *   node scripts/cloudflared.mjs [--env <name>] [--help]
 *
 *   --env <name>   Environment to load from .env.<name> (default: prod)
 *   --help         Print this help and exit
 *
 * Examples:
 *   pnpm tunnel --env staging
 *   pnpm tunnel
 */

import { spawn } from "node:child_process";
import { loadEnv } from "./load-env.mjs";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help")) {
  console.log(`
Usage: node scripts/cloudflared.mjs [--env <name>] [--help]

  --env <name>   Environment to load from .env.<name> (default: prod)
  --help         Print this help and exit

Examples:
  pnpm tunnel --env staging
  pnpm tunnel
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

// ── Print summary ─────────────────────────────────────────────────────────────

console.log(`\n🌐 cloudflared`);
console.log(`   env: ${targetEnv}\n`);

// ── Discover tunnels ──────────────────────────────────────────────────────────

const TUNNEL_ENABLED_RE = /^CLOUDFLARE_TUNNEL_(.+)_ENABLED$/;

const tunnelNames = Object.keys(process.env)
  .map((key) => {
    const match = TUNNEL_ENABLED_RE.exec(key);
    return match ? match[1] : null;
  })
  .filter(Boolean);

if (tunnelNames.length === 0) {
  console.log("No CLOUDFLARE_TUNNEL_*_ENABLED keys found — nothing to launch.");
  process.exit(0);
}

// ── Launch enabled tunnels ────────────────────────────────────────────────────

let launchedCount = 0;

for (const name of tunnelNames) {
  const enabled = process.env[`CLOUDFLARE_TUNNEL_${name}_ENABLED`];
  if (enabled !== "true") continue;

  const token = process.env[`CLOUDFLARE_TUNNEL_${name}_TOKEN`] ?? "";
  if (!token) {
    console.error(`ERROR: CLOUDFLARE_TUNNEL_${name}_TOKEN is not set — skipping`);
    continue;
  }

  const child = spawn("cloudflared", ["tunnel", "run", "--token", token], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  console.log(`✓ Tunnel launched: ${name}`);
  launchedCount++;
}

if (launchedCount === 0) {
  console.log("No tunnels were enabled — nothing launched.");
}

process.exit(0);
