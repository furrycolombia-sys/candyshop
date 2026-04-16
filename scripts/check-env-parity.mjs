#!/usr/bin/env node
/**
 * Validates that all .env.* files share the same set of keys.
 *
 * Env-specific keys (only meaningful for certain environments) can be
 * declared in the OPTIONAL_KEYS set below — they are allowed to be absent
 * in files where they don't apply without causing a failure.
 *
 * Usage:
 *   node scripts/check-env-parity.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Keys that are intentionally only present in specific envs.
// Add here when a key is legitimately env-scoped, not a mistake.
const OPTIONAL_KEYS = new Set([
  // Only local Docker envs need a base port — cloud envs use a hosted URL
  "SUPABASE_PORT",
]);

// ── Parse env file into a Set of key names ────────────────────────────────────

function parseKeys(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments, empty lines, and inline comments after values
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    keys.add(trimmed.slice(0, eqIndex).trim());
  }
  return keys;
}

// ── Discover env files ────────────────────────────────────────────────────────

const envFiles = readdirSync(rootDir)
  .filter((f) => /^\.env\.[a-z]+$/.test(f))
  .sort()
  .map((f) => ({ name: f, path: resolve(rootDir, f) }));

if (envFiles.length < 2) {
  console.log("check-env-parity: fewer than 2 env files found, nothing to compare.");
  process.exit(0);
}

console.log(`\n🔍 check-env-parity — comparing ${envFiles.length} env files:`);
for (const f of envFiles) console.log(`   ${f.name}`);
console.log();

// ── Build key map ─────────────────────────────────────────────────────────────

const keyMap = new Map(); // key → Set of filenames that have it
for (const { name, path } of envFiles) {
  for (const key of parseKeys(path)) {
    if (!keyMap.has(key)) keyMap.set(key, new Set());
    keyMap.get(key).add(name);
  }
}

// ── Find mismatches ───────────────────────────────────────────────────────────

const fileNames = new Set(envFiles.map((f) => f.name));
const errors = [];

for (const [key, presentIn] of [...keyMap.entries()].sort()) {
  if (OPTIONAL_KEYS.has(key)) continue;
  if (presentIn.size === fileNames.size) continue; // all files have it ✓

  const missing = [...fileNames].filter((f) => !presentIn.has(f));
  errors.push({ key, missing });
}

// ── Report ────────────────────────────────────────────────────────────────────

if (errors.length === 0) {
  console.log("✓ All env files have matching keys.\n");
  process.exit(0);
}

console.error(`✗ Key parity violations found (${errors.length}):\n`);
for (const { key, missing } of errors) {
  console.error(`  ${key}`);
  console.error(`    missing from: ${missing.join(", ")}`);
}
console.error(
  `\nFix: add the missing keys to the listed files, or add to OPTIONAL_KEYS in scripts/check-env-parity.mjs if intentionally env-scoped.\n`,
);
process.exit(1);
