/**
 * Load environment variables from root .env.example and .env files.
 *
 * Used by:
 * - Each app's next.config.ts (via require)
 * - Root scripts (orval, graphql-codegen, refresh-openapi-mocks)
 *
 * Precedence (highest wins):
 *   process.env (CLI/CI) > .env (local overrides) > .env.example (defaults)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
/* eslint-enable @typescript-eslint/no-require-imports */

const rootDir = resolve(__dirname, "..");

/**
 * Parse a .env file and set vars into process.env.
 * @param {string} filePath - Absolute path to the env file
 * @param {boolean} override - If true, overwrite existing process.env values
 */
function loadEnvFile(filePath, override = false) {
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
    if (override || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Load root env files in correct precedence order.
 * Call this before reading any process.env values.
 */
function loadRootEnv() {
  // Load defaults first (lowest precedence)
  loadEnvFile(resolve(rootDir, ".env.example"), false);
  // Load local overrides (higher precedence, but never overwrites CLI/CI vars)
  loadEnvFile(resolve(rootDir, ".env"), true);
}

module.exports = { loadRootEnv };
