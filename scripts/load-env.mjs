/**
 * Minimal env loader with $secret: resolution.
 *
 * Loads .env.{TARGET_ENV} (default: dev) and resolves $secret:KEY references.
 *
 * Locally:  reads .secrets file for resolution.
 * CI:       when CI=true, secrets are already in process.env — .secrets is skipped.
 *
 * Usage (from other scripts):
 *   import { loadEnv } from './load-env.mjs';
 *   loadEnv();                        // loads .env.dev
 *   loadEnv('staging');               // loads .env.staging
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const vars = {};
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    vars[key] = val;
  }
  return vars;
}

const SECRET_RE = /(?<!\$)\$secret:([A-Z][A-Z0-9_]*)/g;

function resolveSecrets(vars, secrets) {
  for (const [key, val] of Object.entries(vars)) {
    if (!val.includes("$secret:")) continue;
    vars[key] = val.replace(SECRET_RE, (_, name) => {
      if (!(name in secrets)) throw new Error(`Missing secret: "${name}". Run pnpm sync-secrets.`);
      return secrets[name];
    });
  }
  return vars;
}

export function loadEnv(targetEnv) {
  const env = targetEnv || process.env.TARGET_ENV || "dev";
  const envFile = resolve(rootDir, `.env.${env}`);

  if (!existsSync(envFile)) {
    throw new Error(`Env file not found: .env.${env}`);
  }

  const vars = parseEnvFile(envFile);

  // Resolve $secret: references
  const hasSecretRefs = Object.values(vars).some((v) => v.includes("$secret:"));
  if (hasSecretRefs) {
    if (process.env.CI === "true") {
      // CI: secrets already in process.env — clear unresolved refs
      for (const [key, val] of Object.entries(vars)) {
        if (val.includes("$secret:")) {
          // Use the CI env var directly if available, otherwise empty string
          const match = val.match(/\$secret:([A-Z][A-Z0-9_]*)/);
          vars[key] = match ? (process.env[match[1]] ?? "") : "";
        }
      }
    } else {
      const secretsFile = resolve(rootDir, ".secrets");
      if (!existsSync(secretsFile)) {
        throw new Error("Missing .secrets file. Run pnpm sync-secrets.");
      }
      resolveSecrets(vars, parseEnvFile(secretsFile));
    }
  }

  // Write into process.env — existing vars (CLI/CI overrides) win
  for (const [key, val] of Object.entries(vars)) {
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }

  // Always set TARGET_ENV so app code can read which env is active
  process.env.TARGET_ENV = env;

  // If ENV_DEBUG=true, serialize all resolved vars into a single NEXT_PUBLIC_ var
  // so the playground can display them without needing turbo globalEnv entries.
  if (vars.ENV_DEBUG === "true") {
    const snapshot = { ...vars, TARGET_ENV: env, NODE_ENV: process.env.NODE_ENV ?? "" };
    process.env.NEXT_PUBLIC_ENV_DEBUG = JSON.stringify(snapshot);
  }
}
