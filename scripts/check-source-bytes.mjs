#!/usr/bin/env node
/**
 * Fails when a file that could reach a commit carries a control character.
 *
 * A gate on the repository rather than a unit test, and a plain script for
 * that reason: it reads a couple of thousand files, and bulk IO inside a test
 * runner is a body being timed against a budget meant for unit tests.
 *
 * **It exists because this class of damage is invisible to every other
 * check.** A mangled escape is still valid source: TypeScript parses it,
 * Prettier reformats around it, ESLint reports green. The only symptom is
 * usually grep calling a file binary in the output of an unrelated search,
 * which is not a test.
 *
 * Two instances, both real and both silent:
 *
 * - This repository carried a 0x10 where a `/` belonged, so a review document
 *   recorded a source path as `features<DLE>presentation`. It had been in the
 *   tree since March and nothing had ever reported it.
 * - While removing Playwright's timing waits, a shell heredoc turned `\b` in
 *   a URL regex into a literal 0x08 four separate times. Each one changed
 *   what the pattern matched, and each was found by eye, through `cat -v`,
 *   after the behaviour looked wrong.
 *
 * Adapted from aeleos's script of the same name, which was written after a
 * literal NUL reached main inside a Tailwind `content-['—\00a0']` and rendered
 * a replacement glyph on every public page.
 *
 * Usage:
 *   node scripts/check-source-bytes.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** The extensions worth reading. Anything else may legitimately be binary. */
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|css|json|sql|md|ya?ml)$/;

/** Tab, newline, carriage return — the three a text file legitimately holds. */
const ALLOWED_CONTROL = new Set([9, 10, 13]);

/**
 * Every text file that could reach a commit: tracked, plus untracked files git
 * would not ignore.
 *
 * Asked of git rather than crawled, which is a correctness choice before it is
 * a speed one — a hand-written list of directories to skip is .gitignore
 * restated, and free to drift from it. `--others --exclude-standard` keeps a
 * file written a moment ago and not yet staged inside the gate, which is
 * exactly when a mangled escape is still cheap to fix.
 */
function candidateFiles() {
  const ask = (args) =>
    execFileSync("git", args, { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);

  const paths = new Set([
    ...ask(["ls-files", "--cached"]),
    ...ask(["ls-files", "--others", "--exclude-standard"]),
  ]);

  // --cached reports what the INDEX holds, which includes a file deleted in
  // the working tree whose deletion is not yet staged: a path with no bytes
  // behind it.
  return [...paths].filter((p) => TEXT.test(p) && existsSync(p));
}

/**
 * @param {Buffer} buf
 * @returns {{ byte: number, line: number, column: number } | null}
 */
export function findControlByte(buf) {
  let line = 1;
  let column = 1;
  for (const byte of buf) {
    if (byte === 10) {
      line += 1;
      column = 1;
      continue;
    }
    if (byte < 32 && !ALLOWED_CONTROL.has(byte)) return { byte, line, column };
    column += 1;
  }
  return null;
}

function main() {
  const files = candidateFiles();
  const offenders = [];

  for (const file of files) {
    const found = findControlByte(readFileSync(file));
    if (found) offenders.push({ file, ...found });
  }

  if (offenders.length === 0) {
    console.log(`✓ No control characters in ${files.length} text files.`);
    return;
  }

  console.error("Control characters found:\n");
  for (const o of offenders) {
    const hex = o.byte.toString(16).padStart(2, "0");
    console.error(`  ${o.file}:${o.line}:${o.column}  0x${hex}`);
  }
  console.error(
    "\nThese are almost always a mangled escape -- a tool wrote the character" +
      "\nthe escape names instead of the escape. `cat -v <file>` shows them as" +
      "\n^X. Nothing else in this repository reports them: the file is still" +
      "\nvalid source, so the compiler, the formatter and the linter all pass.\n",
  );
  process.exit(1);
}

// Importable for its test; only scans when run directly.
if (process.argv[1]?.endsWith("check-source-bytes.mjs")) main();
