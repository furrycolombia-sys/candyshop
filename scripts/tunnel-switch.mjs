#!/usr/bin/env node
/**
 * Cloudflare tunnel switcher — routes furrycolombia.com traffic
 * between the local production server and the GCP VM.
 *
 * Whichever machine has cloudflared running wins. This script starts it
 * on the target and stops it on the other side.
 *
 * Usage:
 *   node scripts/tunnel-switch.mjs                    # Traffic -> GCP VM (default)
 *   node scripts/tunnel-switch.mjs gcp                # Traffic -> GCP VM
 *   node scripts/tunnel-switch.mjs local              # Traffic -> local server
 *   node scripts/tunnel-switch.mjs status             # Show state on both servers
 *   node scripts/tunnel-switch.mjs configure-ingress  # (Re-)push ingress rules to Cloudflare API
 *
 * Or via pnpm:
 *   pnpm tunnel:switch           (defaults to gcp)
 *   pnpm tunnel:switch gcp
 *   pnpm tunnel:switch local
 *   pnpm tunnel:switch status
 *   pnpm tunnel:switch configure-ingress
 *
 * ── One-time Cloudflare tunnel setup ────────────────────────────────
 *
 * cloudflared in --token mode fetches its ingress rules from the Cloudflare
 * dashboard API when it starts. Without dashboard-configured hostnames the
 * tunnel connects but returns 503 for every request ("No ingress rules").
 *
 * If you ever see that 503 / "No ingress rules" warning in cloudflared logs,
 * run `configure-ingress` to (re-)push the routing table, then restart
 * cloudflared (the command does this automatically on GCP).
 *
 * What configure-ingress does:
 *   1. Reads CLOUDFLARED_PROD_CERT_PEM_B64 from .secrets — that's the legacy
 *      cert.pem file (base64). Its PEM payload decodes to a JSON object that
 *      contains a Cloudflare API token with tunnel:edit scope.
 *   2. Reads PROD_CLOUDFLARE_TUNNEL_TOKEN from .secrets — the JWT that
 *      cloudflared uses to connect. Its payload contains the tunnel ID and
 *      account ID.
 *   3. Calls PUT /client/v4/accounts/{accountID}/cfd_tunnel/{tunnelID}/configurations
 *      with an ingress array that maps every furrycolombia.com hostname to
 *      http://localhost:{HOST_PORT} (default 9090).
 *   4. Restarts cloudflared on GCP so it picks up the new config immediately.
 *
 * This step was performed manually on 2026-05-11 when switching from the
 * local office server to GCP. GCP's e2-micro was CPU-saturated at the time
 * (zombie deploy processes + cloudflared restart loop), which caused SSH
 * drops and false "context deadline exceeded" errors from cloudflared.
 * After a VM reset (`gcloud compute instances reset`) the network was fine;
 * the only remaining issue was the missing ingress rules.
 */

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "ssh2";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// ── Secrets loader ────────────────────────────────────────────────

function loadSecrets() {
  const path = resolve(rootDir, ".secrets");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

const secrets = loadSecrets();

// ── Server config ─────────────────────────────────────────────────

const LOCAL_HOST = secrets.LOCAL_PROD_SERVER_HOST ?? "";
const LOCAL_USER = secrets.LOCAL_PROD_SERVER_USER ?? "";
const LOCAL_PASS = secrets.LOCAL_PROD_SERVER_PASS ?? "";

const GCP_HOST    = secrets.GCP_PROD_SERVER_HOST ?? "";
const GCP_USER    = secrets.GCP_PROD_SERVER_USER ?? "";
const GCP_KEY_B64 = secrets.GCP_PROD_SERVER_SSH_KEY_B64 ?? "";

// ── SSH helpers ───────────────────────────────────────────────────

function sshConnect(options) {
  return new Promise((res, rej) => {
    const conn = new Client();
    conn.on("ready", () => res(conn)).on("error", rej).connect(options);
  });
}

function connectLocal() {
  if (!LOCAL_HOST || !LOCAL_USER || !LOCAL_PASS) {
    throw new Error(
      "Local server credentials missing from .secrets (need LOCAL_PROD_SERVER_HOST, LOCAL_PROD_SERVER_USER, LOCAL_PROD_SERVER_PASS)",
    );
  }
  return sshConnect({
    host: LOCAL_HOST,
    username: LOCAL_USER,
    password: LOCAL_PASS,
    readyTimeout: 15_000,
  });
}

function connectGcp() {
  if (!GCP_HOST || !GCP_USER || !GCP_KEY_B64) {
    throw new Error(
      "GCP credentials missing from .secrets (need GCP_PROD_SERVER_HOST, GCP_PROD_SERVER_USER, GCP_PROD_SERVER_SSH_KEY_B64)",
    );
  }
  const privateKey = Buffer.from(GCP_KEY_B64, "base64").toString("utf-8");
  return sshConnect({
    host: GCP_HOST,
    username: GCP_USER,
    privateKey,
    readyTimeout: 15_000,
  });
}

/** Run a shell command over SSH. sudoPass feeds the sudo -S prompt (local).
 *  When sudoPass is absent (GCP), uses passwordless sudo directly. */
function run(conn, cmd, sudoPass) {
  return new Promise((res, rej) => {
    const fullCmd = sudoPass
      ? `echo ${JSON.stringify(sudoPass)} | sudo -S sh -c ${JSON.stringify(cmd)} 2>/dev/null`
      : `sudo ${cmd}`;

    conn.exec(fullCmd, (err, stream) => {
      if (err) return rej(err);
      let out = "";
      stream.on("data", (d) => { out += d; });
      stream.stderr.on("data", (d) => { out += d; });
      stream.on("close", () => res(out.trim()));
    });
  });
}

/** Returns "active" | "inactive" | "dead" | "failed" | "unknown" */
async function getStatus(conn, sudoPass) {
  const out = await run(conn, "systemctl is-active cloudflared", sudoPass);
  const last = out.split("\n").at(-1)?.trim() ?? "";
  return ["active", "inactive", "dead", "failed"].includes(last)
    ? last
    : "unknown";
}

async function start(conn, sudoPass) {
  await run(
    conn,
    "systemctl start cloudflared && systemctl enable cloudflared",
    sudoPass,
  );
  return getStatus(conn, sudoPass);
}

async function stop(conn, sudoPass) {
  await run(
    conn,
    "systemctl stop cloudflared && systemctl disable cloudflared",
    sudoPass,
  );
  return getStatus(conn, sudoPass);
}

// ── Cloudflare API helpers ────────────────────────────────────────

/**
 * Parse the Cloudflare API token (tunnel:edit scope) embedded in the
 * cert.pem stored in CLOUDFLARED_PROD_CERT_PEM_B64.
 *
 * cert.pem is a PEM file whose block payload is base64-encoded JSON:
 *   { "accountID": "...", "zoneID": "...", "apiToken": "cfut_..." }
 */
function parseCertPem(certB64) {
  const pem = Buffer.from(certB64, "base64").toString("utf-8");
  const match = pem.match(/-----BEGIN [A-Z ]+-----\n?([\s\S]+?)\n?-----END [A-Z ]+-----/);
  if (!match) throw new Error("No PEM block found in CLOUDFLARED_PROD_CERT_PEM_B64");
  const json = JSON.parse(Buffer.from(match[1].replace(/\s/g, ""), "base64").toString("utf-8"));
  if (!json.apiToken) throw new Error("apiToken not found in cert.pem JSON");
  return { apiToken: json.apiToken, accountID: json.accountID, zoneID: json.zoneID };
}

/**
 * Parse the tunnel ID and account ID from PROD_CLOUDFLARE_TUNNEL_TOKEN.
 * The token is a JWT whose payload contains { "a": accountID, "t": tunnelID }.
 */
function parseTunnelToken(token) {
  const parts = token.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      if (payload.t) return { tunnelID: payload.t, accountID: payload.a };
    } catch {}
  }
  // Older raw base64 JSON format
  const raw = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
  if (!raw.t) throw new Error("Could not extract tunnel ID from PROD_CLOUDFLARE_TUNNEL_TOKEN");
  return { tunnelID: raw.t, accountID: raw.a };
}

// ── Commands ──────────────────────────────────────────────────────

async function cmdStatus() {
  console.log("Checking cloudflared on both servers...\n");

  process.stdout.write(`  Local (${LOCAL_HOST}): `);
  try {
    const c = await connectLocal();
    const s = await getStatus(c, LOCAL_PASS);
    c.end();
    console.log(s === "active" ? "[active]  <-- serving traffic" : `[${s}]`);
  } catch (e) {
    console.log(`[unreachable] ${e.message}`);
  }

  process.stdout.write(`  GCP   (${GCP_HOST}): `);
  try {
    const c = await connectGcp();
    const s = await getStatus(c);
    c.end();
    console.log(s === "active" ? "[active]  <-- serving traffic" : `[${s}]`);
  } catch (e) {
    console.log(`[unreachable] ${e.message}`);
  }
}

async function cmdSwitch(target) {
  console.log(`\nSwitching tunnel to: ${target.toUpperCase()}\n`);

  if (target === "local") {
    process.stdout.write(`[1/2] Starting cloudflared on local (${LOCAL_HOST})... `);
    const local = await connectLocal();
    const s1 = await start(local, LOCAL_PASS);
    local.end();
    console.log(s1 === "active" ? "OK" : `WARNING: ${s1}`);

    process.stdout.write(`[2/2] Stopping  cloudflared on GCP   (${GCP_HOST})... `);
    try {
      const gcp = await connectGcp();
      const s2 = await stop(gcp);
      gcp.end();
      console.log(["inactive", "dead"].includes(s2) ? "OK" : `WARNING: ${s2}`);
    } catch (e) {
      console.log(`skipped (${e.message})`);
    }
  } else {
    process.stdout.write(`[1/2] Starting cloudflared on GCP   (${GCP_HOST})... `);
    const gcp = await connectGcp();
    const s1 = await start(gcp);
    gcp.end();
    console.log(s1 === "active" ? "OK" : `WARNING: ${s1}`);

    process.stdout.write(`[2/2] Stopping  cloudflared on local (${LOCAL_HOST})... `);
    const local = await connectLocal();
    const s2 = await stop(local, LOCAL_PASS);
    local.end();
    console.log(["inactive", "dead"].includes(s2) ? "OK" : `WARNING: ${s2}`);
  }

  console.log(`\nDone. store.furrycolombia.com is now served from: ${target.toUpperCase()}`);
}

/**
 * Push ingress rules to the Cloudflare tunnel config API, then restart
 * cloudflared on GCP so it picks up the new routing immediately.
 *
 * Run this whenever:
 *  - You see "No ingress rules" in cloudflared logs (returns 503)
 *  - You change the tunnel token / switch to a new tunnel
 *  - You add or remove a public hostname
 */
async function cmdConfigureIngress() {
  console.log("\nConfiguring Cloudflare tunnel ingress rules...\n");

  const certB64 = secrets.CLOUDFLARED_PROD_CERT_PEM_B64 ?? "";
  if (!certB64) throw new Error("CLOUDFLARED_PROD_CERT_PEM_B64 missing from .secrets");

  const tunnelToken = secrets.PROD_CLOUDFLARE_TUNNEL_TOKEN ?? "";
  if (!tunnelToken) throw new Error("PROD_CLOUDFLARE_TUNNEL_TOKEN missing from .secrets");

  const { apiToken, accountID: certAccountID } = parseCertPem(certB64);
  const { tunnelID, accountID: tokenAccountID } = parseTunnelToken(tunnelToken);
  const accountID = certAccountID ?? tokenAccountID;

  if (!accountID) throw new Error("Could not determine Cloudflare account ID from .secrets");

  const hostPort = secrets.HOST_PORT ?? "9090";
  const service  = `http://localhost:${hostPort}`;

  const hostnames = [
    "furrycolombia.com",
    "www.furrycolombia.com",
    "store.furrycolombia.com",
    "auth.furrycolombia.com",
    "admin.furrycolombia.com",
    "payments.furrycolombia.com",
    "landing.furrycolombia.com",
    "studio.furrycolombia.com",
  ];

  const ingress = [
    ...hostnames.map((hostname) => ({ hostname, service })),
    { service: "http_status:404" }, // catch-all (required by Cloudflare)
  ];

  process.stdout.write(`  Pushing ${hostnames.length} ingress rules to tunnel ${tunnelID}... `);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountID}/cfd_tunnel/${tunnelID}/configurations`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ config: { ingress } }),
  });

  const data = await resp.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
  }
  console.log(`OK (config version ${data.result?.version ?? "?"})`);
  console.log(`  Service: ${service}`);

  // Restart cloudflared on GCP so it fetches the new config
  process.stdout.write(`  Restarting cloudflared on GCP (${GCP_HOST})... `);
  const conn = await connectGcp();
  await run(conn, "systemctl restart cloudflared");
  await new Promise((r) => setTimeout(r, 5_000));
  const status = await getStatus(conn);
  conn.end();
  console.log(status === "active" ? "OK" : `WARNING: ${status}`);

  console.log("\nDone. Ingress rules are live.");
}

// ── Main ──────────────────────────────────────────────────────────

const target = process.argv[2] ?? "gcp";
if (!["local", "gcp", "status", "configure-ingress"].includes(target)) {
  console.error(
    "Usage: node scripts/tunnel-switch.mjs [gcp|local|status|configure-ingress]\n" +
    "       pnpm tunnel:switch [gcp|local|status|configure-ingress]\n" +
    "       (no argument defaults to gcp)",
  );
  process.exit(1);
}

try {
  if (target === "status") {
    await cmdStatus();
  } else if (target === "configure-ingress") {
    await cmdConfigureIngress();
  } else {
    await cmdSwitch(target);
  }
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
