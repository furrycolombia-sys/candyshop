#!/usr/bin/env node
/**
 * Enumerates every test case in the repo: file, suite path, and test name.
 *
 * The point is comparison across a refactor. Run it before moving anything,
 * run it after, and diff the two: a case that was dropped, renamed into
 * something meaningless, or silently skipped shows up as a line. Counting
 * files -- or even counting tests -- is not enough, because a rework can keep
 * both totals and still lose the one assertion that mattered.
 *
 * Counts SOURCE-level cases, not runner-expanded ones. A describe.each over
 * two themes containing an it.each over ten pairs is two entries here and
 * twenty in vitest output. Source level is the right unit for this job, but it
 * means these totals deliberately do not match a vitest run. Parameterised
 * cases are marked so the difference is visible rather than surprising.
 *
 * Runtime skips are not detected: test.skip(cond, ...) inside a test body is a
 * call, not a modifier, and only modifiers are counted.
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".git",
  "test-results",
  "playwright-report",
  ".ai-context",
  ".superpowers",
]);

const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mts)$/;
const QUOTES = new Set([
  String.fromCharCode(34),
  String.fromCharCode(39),
  String.fromCharCode(96),
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEST_FILE.test(entry)) out.push(full);
  }
  return out;
}

/** Skips a balanced parenthesis group starting at open; returns index after it. */
function afterGroup(source, open) {
  let depth = 0;
  let i = open;
  do {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") depth--;
    i++;
  } while (i < source.length && depth > 0);
  return i;
}

/** Reads a quoted string at or after i. Returns { value, end } or null. */
function readString(source, i) {
  let k = i;
  while (k < source.length && /\s/.test(source[k])) k++;
  const quote = source[k];
  if (!QUOTES.has(quote)) return null;
  const end = source.indexOf(quote, k + 1);
  if (end === -1) return null;
  return { value: source.slice(k + 1, end), end };
}

/** Brace depth at an offset, ignoring braces inside strings. */
function braceDepthAt(source, offset) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < offset; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (QUOTES.has(ch)) quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return depth;
}

/**
 * Extracts describe/it/test names.
 *
 * Deliberately a scanner rather than a parser: it must keep working on a file
 * that does not compile, which is the state a half-finished refactor leaves
 * things in. It handles the plain form and the .each form; the second is easy
 * to miss because an argument group sits between the token and the name, so a
 * naive regex skips those cases and the report quietly under-reports.
 */
function extractCases(source) {
  const cases = [];
  const stack = [];
  const token = /\b(describe|it|test)((?:\.\w+)*)\s*\(/g;

  for (const m of source.matchAll(token)) {
    const kind = m[1];
    const modifiers = m[2];
    const openParen = m.index + m[0].length - 1;

    let nameAt = openParen + 1;
    const parameterised = modifiers.includes(".each");
    if (parameterised) {
      let k = afterGroup(source, openParen);
      while (k < source.length && /\s/.test(source[k])) k++;
      if (source[k] !== "(") continue;
      nameAt = k + 1;
    }

    const str = readString(source, nameAt);
    if (!str) continue;

    const depth = braceDepthAt(source, m.index);
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth)
      stack.pop();

    if (kind === "describe") {
      stack.push({ name: str.value, depth });
    } else {
      cases.push({
        suite: stack.map((s) => s.name).join(" > "),
        name: str.value,
        skipped: /\.(skip|todo|fixme)\b/.test(modifiers),
        parameterised,
      });
    }
  }
  return cases;
}

/** Which suite a file belongs to, so the report groups the way CI does. */
function classify(rel) {
  if (rel.includes("/e2e/") || rel.endsWith(".spec.ts")) return "e2e";
  if (rel.startsWith("tests/db")) return "db";
  if (rel.startsWith("tests/legacy")) return "legacy-snapshot";
  if (rel.startsWith("packages/")) return "package:" + rel.split("/")[1];
  if (rel.startsWith("apps/")) return "app:" + rel.split("/")[1];
  return "other";
}

const files = walk(rootDir).sort();
const entries = files.map((file) => {
  const rel = relative(rootDir, file).split("\\").join("/");
  return {
    file: rel,
    group: classify(rel),
    cases: extractCases(readFileSync(file, "utf-8")),
  };
});

const totalCases = entries.reduce((n, e) => n + e.cases.length, 0);
const skipped = entries.reduce(
  (n, e) => n + e.cases.filter((c) => c.skipped).length,
  0,
);
const parameterised = entries.reduce(
  (n, e) => n + e.cases.filter((c) => c.parameterised).length,
  0,
);

const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const asJson = args.includes("--json");
const outPath = resolve(
  rootDir,
  outFlag === -1
    ? asJson
      ? "tests/inventory.json"
      : "tests/INVENTORY.md"
    : args[outFlag + 1],
);
mkdirSync(dirname(outPath), { recursive: true });

if (asJson) {
  writeFileSync(
    outPath,
    JSON.stringify(
      { totalFiles: files.length, totalCases, skipped, parameterised, entries },
      null,
      2,
    ) + "\n",
  );
} else {
  const byGroup = new Map();
  for (const e of entries) {
    if (!byGroup.has(e.group)) byGroup.set(e.group, []);
    byGroup.get(e.group).push(e);
  }

  const lines = [
    "# Test inventory",
    "",
    "> Generated by `node scripts/test-inventory.mjs`. Do not edit by hand.",
    "",
    "Every test case in the repo, so a refactor can be checked for losses:",
    "regenerate and diff. Counting files or totals is not enough -- a rework",
    "can keep both and still drop the one assertion that mattered.",
    "",
    "**" +
      totalCases +
      " cases across " +
      files.length +
      " files** (" +
      skipped +
      " skipped, " +
      parameterised +
      " parameterised).",
    "",
    "Source-level cases: a `.each` case is one entry here and many in vitest",
    "output, so this total is deliberately not the runner total.",
    "",
  ];

  for (const group of [...byGroup.keys()].sort()) {
    const groupEntries = byGroup.get(group);
    const n = groupEntries.reduce((a, e) => a + e.cases.length, 0);
    lines.push("## " + group + " -- " + n + " cases", "");
    for (const e of groupEntries.sort((a, b) => a.file.localeCompare(b.file))) {
      if (e.cases.length === 0) continue;
      lines.push("### `" + e.file + "`", "");
      for (const c of e.cases) {
        const flags =
          (c.skipped ? "**[skipped]** " : "") +
          (c.parameterised ? "*(parameterised)* " : "");
        lines.push("- " + flags + (c.suite ? c.suite + " > " : "") + c.name);
      }
      lines.push("");
    }
  }
  writeFileSync(outPath, lines.join("\n"));
}

console.log(
  totalCases +
    " cases across " +
    files.length +
    " files (" +
    skipped +
    " skipped, " +
    parameterised +
    " parameterised) -> " +
    relative(rootDir, outPath),
);
