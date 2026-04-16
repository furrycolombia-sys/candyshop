#!/usr/bin/env node
/**
 * Verifies all .env.X files have exactly the same set of keys.
 * No file may have more or fewer keys than the others.
 * Run: node scripts/lint-envs.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function parseKeys(filePath) {
  const keys = new Set();
  for (const line of readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    keys.add(trimmed.slice(0, eq).trim());
  }
  return keys;
}

// Find all .env.X files (exclude .env.local, .env.backup, etc.)
const envFiles = readdirSync(rootDir)
  .filter((f) => /^\.env\.[a-z]+$/.test(f) && f !== ".env.backup")
  .map((f) => ({ name: f, path: resolve(rootDir, f) }));

if (envFiles.length < 2) {
  console.log("Less than 2 env files found, nothing to compare.");
  process.exit(0);
}

// Parse all keys
const parsed = envFiles.map(({ name, path }) => ({
  name,
  keys: parseKeys(path),
}));

// Union of all keys across all files
const allKeys = new Set(parsed.flatMap(({ keys }) => [...keys]));

let hasErrors = false;

for (const { name, keys } of parsed) {
  const missing = [...allKeys].filter((k) => !keys.has(k));
  if (missing.length > 0) {
    console.error(`\n${name} is missing ${missing.length} key(s):`);
    for (const k of missing) console.error(`  - ${k}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\nAll .env.X files must have the same keys. Fix the above and re-run.");
  process.exit(1);
} else {
  console.log(`All ${envFiles.length} env files are in sync (${allKeys.size} keys each).`);
  console.log(envFiles.map((f) => `  ${f.name}`).join("\n"));
}
