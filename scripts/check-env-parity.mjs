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

// Groups of env files that must have key parity among themselves.
// Files in different groups are allowed to have different keys.
// Add a new group if you introduce a new topology (e.g. edge, preview).
const PARITY_GROUPS = [
  // Local envs: run Supabase in Docker, need SUPABASE_PORT etc.
  [".env.dev", ".env.test"],
  // Cloud/hosted envs: use Supabase Cloud, no local port config needed.
  [".env.staging", ".env.prod"],
];

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

const allEnvFiles = readdirSync(rootDir)
  .filter((f) => /^\.env\.[a-z]+$/.test(f))
  .sort();

console.log(`\n🔍 check-env-parity — found ${allEnvFiles.length} env files:`);
for (const f of allEnvFiles) console.log(`   ${f}`);
console.log();

// ── Check parity within each group ───────────────────────────────────────────

let totalErrors = 0;

for (const group of PARITY_GROUPS) {
  // Only check files that actually exist
  const members = group.filter((f) => allEnvFiles.includes(f));
  if (members.length < 2) continue;

  console.log(`Checking group: ${members.join(", ")}`);

  // Build key map for this group
  const keyMap = new Map(); // key → Set of filenames that have it
  for (const name of members) {
    const filePath = resolve(rootDir, name);
    for (const key of parseKeys(filePath)) {
      if (!keyMap.has(key)) keyMap.set(key, new Set());
      keyMap.get(key).add(name);
    }
  }

  const memberSet = new Set(members);
  const errors = [];

  for (const [key, presentIn] of [...keyMap.entries()].sort()) {
    if (presentIn.size === memberSet.size) continue; // all members have it ✓
    const missing = members.filter((f) => !presentIn.has(f));
    errors.push({ key, missing });
  }

  if (errors.length === 0) {
    console.log(`✓ All keys match.\n`);
  } else {
    totalErrors += errors.length;
    console.error(`✗ ${errors.length} key parity violation(s):\n`);
    for (const { key, missing } of errors) {
      console.error(`  ${key}`);
      console.error(`    missing from: ${missing.join(", ")}`);
    }
    console.error();
  }
}

if (totalErrors > 0) {
  console.error(
    `Fix: add the missing keys to the listed files, or move them to a different parity group in scripts/check-env-parity.mjs if intentionally env-scoped.\n`,
  );
  process.exit(1);
}

process.exit(0);
