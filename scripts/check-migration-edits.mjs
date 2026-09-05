#!/usr/bin/env node
/**
 * Fails when a migration that has already been applied is edited in place.
 *
 * The migration set is squashed: every object is defined exactly once, so
 * "change the function" looks like an edit to the file that already defines
 * it. It is not. Supabase records an applied migration by name and never
 * re-runs it, so an in-place edit reaches the file and never reaches a
 * database that has already run it -- silently, and without ever failing.
 *
 * Nothing else in this repository can see that. tests/db builds a fresh
 * database from these files, where the file and the database agree by
 * construction. aeleos found the same blind spot the expensive way: a function
 * on its live project was missing an entire validation block for five merged
 * pull requests while every check passed, because every check was reading a
 * database built from the file.
 *
 * This is the cheap half of that problem -- catching the edit at review time
 * rather than diffing a live schema, which needs a live database to diff
 * against. The expensive half is worth adding once production exists again.
 *
 * Usage:
 *   node scripts/check-migration-edits.mjs [baseRef]
 */

import { execFileSync } from "node:child_process";

import {
  EDITABLE,
  findOffenders,
  MIGRATIONS_DIR,
} from "./lib/migration-edits.mjs";

function changedMigrations(baseRef) {
  const out = execFileSync(
    "git",
    ["diff", "--name-status", `${baseRef}...HEAD`, "--", MIGRATIONS_DIR],
    { encoding: "utf-8" },
  );
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split("\t");
      return { status: status.trim(), path: rest.at(-1).trim() };
    });
}

function main() {
  const baseRef = process.argv[2] ?? "origin/develop";

  let changes;
  try {
    changes = changedMigrations(baseRef);
  } catch (error) {
    console.error(`Could not diff against ${baseRef}: ${error.message}`);
    process.exit(1);
  }

  const offenders = findOffenders(changes, EDITABLE);

  if (offenders.length === 0) {
    console.log(
      `✓ No applied migration was edited (${changes.length} migration change(s) against ${baseRef}).`,
    );
    return;
  }

  console.error("Applied migrations were edited in place:\n");
  for (const o of offenders) console.error(`  ${o.status}  ${o.path}`);
  console.error(
    "\nSupabase never re-runs a migration it has already recorded, so these" +
      "\nedits will not reach any database that has already applied them. Add a" +
      "\nnew timestamped migration instead -- including for changes to something" +
      "\nan existing file defines.\n",
  );
  process.exit(1);
}

main();
