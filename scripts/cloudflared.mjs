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
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
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

// ── Generate ~/.cloudflared/config.yml from env ───────────────────────────────

const tunnelId = process.env.CLOUDFLARE_TUNNEL_ID;

if (tunnelId) {
  const credentialsFile = resolve(homedir(), ".cloudflared", `${tunnelId}.json`);

  const appOrigin = process.env.APP_PUBLIC_ORIGIN;
  if (!appOrigin) {
    console.error("ERROR: APP_PUBLIC_ORIGIN is not set — cannot generate tunnel config");
    process.exit(1);
  }
  const appPort = Number.parseInt(new URL(appOrigin).port, 10);
  if (Number.isNaN(appPort)) {
    console.error(`ERROR: APP_PUBLIC_ORIGIN has no port: ${appOrigin}`);
    process.exit(1);
  }

  const supabasePortRaw = process.env.SUPABASE_PORT;
  if (!supabasePortRaw || supabasePortRaw === "N/A") {
    console.error("ERROR: SUPABASE_PORT is not set — cannot generate tunnel config");
    process.exit(1);
  }
  const supabasePort = Number.parseInt(supabasePortRaw, 10);
  if (Number.isNaN(supabasePort)) {
    console.error(`ERROR: SUPABASE_PORT is not a valid number: ${supabasePortRaw}`);
    process.exit(1);
  }

  const siteUrl = process.env.SUPABASE_AUTH_SITE_URL;
  if (!siteUrl) {
    console.error("ERROR: SUPABASE_AUTH_SITE_URL is not set — cannot derive hostname");
    process.exit(1);
  }
  const baseHost = new URL(siteUrl).hostname.split(".").slice(-2).join(".");

  const configPath = resolve(homedir(), ".cloudflared", "config.yml");
  const config = `tunnel: ${tunnelId}
credentials-file: ${credentialsFile}
protocol: http2

ingress:
  - hostname: ${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: www.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: store.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: auth.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: admin.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: payments.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: playground.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: studio.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: landing.${baseHost}
    service: http://127.0.0.1:${appPort}
  - hostname: supabase.${baseHost}
    service: http://127.0.0.1:${supabasePort}
  - hostname: supabase-studio.${baseHost}
    service: http://127.0.0.1:${supabasePort + 2}
  - hostname: mailpit.${baseHost}
    service: http://127.0.0.1:${supabasePort + 3}
  - service: http_status:404
`;
  writeFileSync(configPath, config, "utf-8");
  console.log(`✓ Generated ~/.cloudflared/config.yml (app: ${appPort}, supabase: ${supabasePort})`);
}

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
