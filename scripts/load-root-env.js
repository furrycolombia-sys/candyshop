/**
 * Load environment variables from root env files with secret resolution.
 *
 * Used by:
 * - Each app's next.config.ts (via require)
 * - Root scripts (site-prod, e2e-docker, grant-user-role, etc.)
 *
 * Precedence (highest wins):
 *   process.env (CLI/CI) > secret resolution > .env.{TARGET_ENV} > .env.example (defaults)
 *
 * Secret references:
 *   Values matching `$secret:KEY_NAME` are resolved from the `.secrets` file.
 *   Escape with `$$secret:` to produce the literal string `$secret:`.
 *   In CI (CI=true), secrets come from process.env instead of `.secrets`.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
/* eslint-enable @typescript-eslint/no-require-imports */

const rootDir = resolve(__dirname, "..");

/**
 * Regex matching an unescaped $secret:KEY_NAME reference.
 * KEY_NAME must start with [A-Z] and continue with [A-Z0-9_]*.
 * A leading `$` (i.e. `$$secret:`) is an escape — not a reference.
 */
const SECRET_REF_RE = /(?<!\$)\$secret:([A-Z][A-Z0-9_]*)/g;

// ── Secret reference helpers ────────────────────────────────────

/**
 * Check if a value contains at least one unescaped $secret:KEY_NAME reference.
 * @param {string} value
 * @returns {boolean}
 */
function containsSecretRef(value) {
  SECRET_REF_RE.lastIndex = 0;
  return SECRET_REF_RE.test(value);
}

/**
 * Resolve all $secret:KEY_NAME references in a value against a secrets map.
 * Escaped sequences ($$secret:KEY) are unescaped to the literal $secret:KEY.
 * @param {string} value - The raw value (may contain $secret:KEY_NAME)
 * @param {Record<string, string>} secrets - The loaded secrets map
 * @returns {string} The resolved value
 * @throws {Error} If a referenced secret key is not found in the map
 */
function resolveSecretRef(value, secrets) {
  // First, replace unescaped $secret: references with actual values.
  const resolved = value.replace(SECRET_REF_RE, (_match, keyName) => {
    if (!(keyName in secrets)) {
      throw new Error(
        `Missing secret "${keyName}". Run \`pnpm sync-secrets\` to fetch secrets from GitHub.`,
      );
    }
    return secrets[keyName];
  });
  // Then unescape $$secret: → $secret:
  return resolved.replace(/\$\$secret:/g, "$secret:");
}

/**
 * Parse a .secrets file into a key-value map.
 * Format: KEY=VALUE (one per line), # for comments, blank lines ignored.
 * @param {string} filePath - Absolute path to the secrets file
 * @returns {Record<string, string>}
 */
function parseSecretsFile(filePath) {
  const secrets = {};
  if (!existsSync(filePath)) return secrets;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    secrets[key] = val;
  }
  return secrets;
}

// ── Env file loader ─────────────────────────────────────────────

/**
 * Parse a .env file and set vars into process.env.
 * @param {string} filePath - Absolute path to the env file
 * @param {(key: string) => boolean} canSet - Returns true when the env var may be written
 */
function loadEnvFile(filePath, canSet = () => true) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (canSet(key)) {
      process.env[key] = value;
    }
  }
}

// ── Main loader ─────────────────────────────────────────────────

/**
 * Load root env files in correct precedence order with secret resolution.
 * Call this before reading any process.env values.
 *
 * @param {object} [options]
 * @param {string} [options.targetEnv] - Override for TARGET_ENV (defaults to process.env.TARGET_ENV || 'dev')
 */
function loadRootEnv(options = {}) {
  const targetEnv = options.targetEnv || process.env.TARGET_ENV || "dev";
  const envFilePath = resolve(rootDir, `.env.${targetEnv}`);

  if (!existsSync(envFilePath)) {
    throw new Error(
      `Env file not found: .env.${targetEnv}. Valid environments: dev, staging, e2e, prod`,
    );
  }

  const protectedKeys = new Set(Object.keys(process.env));

  // 1. Load defaults first (lowest precedence)
  loadEnvFile(resolve(rootDir, ".env.example"), (key) => !process.env[key]);

  // 2. Load target env file (overrides defaults, but not CLI/CI vars)
  loadEnvFile(
    envFilePath,
    (key) => !protectedKeys.has(key) || !process.env[key],
  );

  // 3. Resolve $secret: references
  const isCI = process.env.CI === "true";
  const secretsPath = resolve(rootDir, ".secrets");

  // Collect all keys that have $secret: references
  const keysWithSecretRefs = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (value && containsSecretRef(value)) {
      keysWithSecretRefs.push(key);
    }
  }

  if (keysWithSecretRefs.length > 0) {
    if (isCI) {
      // In CI, secrets should already be in process.env.
      // Any remaining $secret: references mean CI is missing required vars.
      const unresolvedKeys = keysWithSecretRefs.filter(
        (key) => process.env[key] && containsSecretRef(process.env[key]),
      );
      if (unresolvedKeys.length > 0) {
        throw new Error(
          `CI environment is missing required secret env vars for: ${unresolvedKeys.join(", ")}. ` +
            `Ensure these are set as GitHub Actions secrets.`,
        );
      }
    } else {
      // Local: load .secrets file and resolve references
      if (!existsSync(secretsPath)) {
        throw new Error(
          `Secrets file not found at .secrets. Run \`pnpm sync-secrets\` to create it.`,
        );
      }

      const secrets = parseSecretsFile(secretsPath);

      for (const key of keysWithSecretRefs) {
        const rawValue = process.env[key];
        if (rawValue && containsSecretRef(rawValue)) {
          try {
            process.env[key] = resolveSecretRef(rawValue, secrets);
          } catch (err) {
            throw new Error(
              `Failed to resolve secret in env var "${key}": ${err.message}`,
            );
          }
        }
      }
    }
  }
}

module.exports = {
  loadRootEnv,
  containsSecretRef,
  resolveSecretRef,
  parseSecretsFile,
};
