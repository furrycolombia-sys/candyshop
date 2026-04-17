/**
 * CJS shim for load-root-env — delegates to load-env.mjs.
 *
 * Playwright configs and app-url-resolver.js use require() so they need a CJS
 * entry point. This shim bridges them to the ESM load-env.mjs loader.
 *
 * Usage (existing callers):
 *   const { loadRootEnv } = require('./load-root-env.cjs');
 *   loadRootEnv({ targetEnv: 'staging' });
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { existsSync, readFileSync } = require("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolve, dirname } = require("node:path");

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
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    vars[key] = val;
  }
  return vars;
}

const SECRET_RE = /(?<!\$)\$secret:([A-Z][A-Z0-9_]*)/g;

function resolveSecrets(vars, secrets) {
  for (const [key, val] of Object.entries(vars)) {
    if (!val.includes("$secret:")) continue;
    vars[key] = val.replace(SECRET_RE, (_, name) => {
      if (!(name in secrets))
        throw new Error(`Missing secret: "${name}". Run pnpm sync-secrets.`);
      return secrets[name];
    });
  }
  return vars;
}

/**
 * Load .env.<targetEnv> into process.env, resolving $secret: references.
 *
 * @param {{ targetEnv?: string }} [opts]
 */
function loadRootEnv(opts) {
  const env = (opts && opts.targetEnv) || process.env.TARGET_ENV || "dev";
  const envFile = resolve(rootDir, `.env.${env}`);

  if (!existsSync(envFile)) {
    throw new Error(`Env file not found: .env.${env}`);
  }

  const vars = parseEnvFile(envFile);

  const hasSecretRefs = Object.values(vars).some((v) => v.includes("$secret:"));
  if (hasSecretRefs) {
    if (process.env.CI === "true") {
      for (const [key, val] of Object.entries(vars)) {
        if (val.includes("$secret:")) {
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

  for (const [key, val] of Object.entries(vars)) {
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }

  process.env.TARGET_ENV = env;

  if (vars.ENV_DEBUG === "true") {
    const snapshot = {
      ...vars,
      TARGET_ENV: env,
      NODE_ENV: process.env.NODE_ENV ?? "",
    };
    process.env.NEXT_PUBLIC_ENV_DEBUG = JSON.stringify(snapshot);
  }
}

module.exports = { loadRootEnv };
