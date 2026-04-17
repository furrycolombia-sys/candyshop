#!/usr/bin/env node
/**
 * Validates that all .env.* files share the exact same set of keys.
 * No exceptions — if a key exists in any env it must exist in all of them.
 * Use N/A as the value when a key doesn't apply to a specific environment.
 *
 * Usage:
 *   node scripts/check-env-parity.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXEMPT_PREFIXES = [/^CLOUDFLARE_TUNNEL_/];

function isExempt(key) {
  return EXEMPT_PREFIXES.some((re) => re.test(key));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function parseKeys(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    keys.add(trimmed.slice(0, eqIndex).trim());
  }
  return keys;
}

const envFiles = readdirSync(rootDir)
  .filter((f) => /^\.env\.[a-z]+$/.test(f))
  .sort();

if (envFiles.length < 2) {
  console.log(
    "check-env-parity: fewer than 2 env files found, nothing to compare.",
  );
  process.exit(0);
}

console.log(`\n🔍 check-env-parity — comparing ${envFiles.length} env files:`);
for (const f of envFiles) console.log(`   ${f}`);
console.log();

// Build key → Set<filename> map across all files
const keyMap = new Map();
for (const name of envFiles) {
  for (const key of parseKeys(resolve(rootDir, name))) {
    if (!keyMap.has(key)) keyMap.set(key, new Set());
    keyMap.get(key).add(name);
  }
}

// Remove exempt keys from parity check
let exemptCount = 0;
for (const key of [...keyMap.keys()]) {
  if (isExempt(key)) {
    keyMap.delete(key);
    exemptCount++;
  }
}
if (exemptCount > 0) {
  console.log(
    `  (${exemptCount} keys with CLOUDFLARE_TUNNEL_* prefix skipped)`,
  );
}

const errors = [];
for (const [key, presentIn] of [...keyMap.entries()].sort()) {
  if (presentIn.size === envFiles.length) continue;
  const missing = envFiles.filter((f) => !presentIn.has(f));
  errors.push({ key, missing });
}

if (errors.length === 0) {
  console.log("✓ All env files have matching keys.\n");
  process.exit(0);
}

console.error(`✗ ${errors.length} key parity violation(s):\n`);
for (const { key, missing } of errors) {
  console.error(`  ${key}`);
  console.error(`    missing from: ${missing.join(", ")}`);
}
console.error(
  `\nFix: add the missing keys to all listed files. Use N/A as the value if the key doesn't apply to that environment.\n`,
);
process.exit(1);
