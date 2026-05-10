#!/usr/bin/env node
/**
 * Cloudflare tunnel switcher — routes store.furrycolombia.com traffic
 * between the local production server and the GCP VM.
 *
 * Whichever machine has cloudflared running wins. This script starts it
 * on the target and stops it on the other side.
 *
 * Usage:
 *   node scripts/tunnel-switch.mjs local    # Traffic -> local server
 *   node scripts/tunnel-switch.mjs gcp      # Traffic -> GCP VM
 *   node scripts/tunnel-switch.mjs status   # Show state on both servers
 *
 * Or via pnpm:
 *   pnpm tunnel:switch local
 *   pnpm tunnel:switch gcp
 *   pnpm tunnel:switch status
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

/** Run a shell command over SSH. sudoPass feeds the sudo -S prompt. */
function run(conn, cmd, sudoPass) {
  return new Promise((res, rej) => {
    // Wrap in echo pipe so sudo -S can read the password from stdin
    const fullCmd = sudoPass
      ? `echo ${JSON.stringify(sudoPass)} | sudo -S sh -c ${JSON.stringify(cmd)} 2>/dev/null`
      : cmd;

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

// ── Main ──────────────────────────────────────────────────────────

const target = process.argv[2];
if (!["local", "gcp", "status"].includes(target)) {
  console.error(
    "Usage: node scripts/tunnel-switch.mjs [local|gcp|status]\n" +
    "       pnpm tunnel:switch [local|gcp|status]",
  );
  process.exit(1);
}

try {
  if (target === "status") {
    await cmdStatus();
  } else {
    await cmdSwitch(target);
  }
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
