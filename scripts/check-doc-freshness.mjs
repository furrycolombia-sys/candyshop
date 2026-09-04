#!/usr/bin/env node
/**
 * CLI for the stale-documentation check. The logic lives in
 * scripts/lib/doc-freshness.mjs so the tests can import it without running a
 * git command.
 *
 * Usage:
 *   node scripts/check-doc-freshness.mjs [baseRef]   compare baseRef...HEAD
 *   node scripts/check-doc-freshness.mjs --staged     compare HEAD to the index
 */
import { execFileSync } from "node:child_process";

import { extractSymbols, findStale } from "./lib/doc-freshness.mjs";

/**
 * Reads a path at a git ref.
 *
 * @param ref - a git ref, or the empty string to read the index.
 * @param file - the repository-relative path.
 * @returns the file's contents, or an empty string when it does not exist
 * there.
 */
function atRef(ref, file) {
  try {
    // stderr is discarded deliberately: a newly added file makes `git show`
    // print "fatal: path ... exists on disk, but not in HEAD", which is
    // expected here and handled by returning "". Letting it through would
    // print a fatal on every commit that adds a file, and a gate that cries
    // wolf gets ignored.
    return execFileSync("git", ["show", `${ref}:${file}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/**
 * Compares two revisions and reports stale documentation.
 *
 * @returns nothing; exits non-zero when anything is found.
 */
function main() {
  const staged = process.argv.includes("--staged");
  const base = staged
    ? "HEAD"
    : (process.argv.slice(2).find((a) => !a.startsWith("--")) ??
      "origin/develop");

  const listArgs = staged
    ? ["diff", "--cached", "--name-only"]
    : ["diff", "--name-only", `${base}...HEAD`];

  const changed = execFileSync("git", listArgs, { encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim())
    .filter(
      (f) =>
        // .mjs is in scope because this repo's tooling lives in scripts/ and
        // is among its most doc-dense code. Including it widened the sample
        // by nine commits and produced no new findings, so it is coverage at
        // no cost in noise.
        /\.(tsx?|mjs)$/.test(f) &&
        !/\.(test|spec)\.(tsx?|mjs)$/.test(f) &&
        !/(^|\/)(generated|__generated__)\//.test(f),
    );

  let findings = 0;
  for (const file of changed) {
    // "" as a ref reads the index, which is what a pre-commit run compares.
    const before = atRef(base, file);
    const after = staged ? atRef("", file) : atRef("HEAD", file);
    if (!before || !after) continue;
    for (const { name } of findStale(
      extractSymbols(before, file),
      extractSymbols(after, file),
    )) {
      findings += 1;
      console.error(
        `${file}: \`${name}\` changed but its TSDoc did not. ` +
          `Update it, or restate the invariant that still holds.`,
      );
    }
  }

  if (findings) {
    console.error(
      `\n${findings} symbol(s) with documentation that may be stale.`,
    );
    process.exit(1);
  }
  console.log(
    `Documentation moved with the code (${changed.length} file(s) checked).`,
  );
}

main();
