#!/usr/bin/env node
/**
 * Fails when an instruction file cites a path or a pnpm script that does not
 * exist.
 *
 * `.claude/**` and `CLAUDE.md` are loaded into every session, so a wrong
 * instruction there is not a stale comment -- it is a confident, wrong
 * direction given to whoever reads next, and it costs time before anyone
 * notices it was the document that was wrong. This repository had several:
 * twelve references to an `apps/web` that does not exist (the reference app
 * is `apps/store`, as CLAUDE.md says), a mutator path that had moved, and
 * `pnpm type-check` for a script named `typecheck`.
 *
 * Only prose is checked. Fenced code blocks are skipped, because a skill that
 * generates setup guides shows an example `package.json` with scripts this
 * repository does not have, and an audit skill shows an example report row
 * naming a file that never existed. Both are illustrations, not claims.
 *
 * Paths matched by .gitignore are skipped too: `.claude/portability-exceptions.json`
 * is documented as deliberately untracked.
 *
 * Usage:
 *   node scripts/check-doc-references.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

/** Paths git is told to ignore, which are absent by design rather than by error. */
function ignoredPaths(candidates) {
  if (candidates.length === 0) return new Set();
  try {
    const out = execFileSync("git", ["check-ignore", ...candidates], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(
      out
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } catch {
    // check-ignore exits 1 when nothing matches, which is not an error here.
    return new Set();
  }
}

/** The file's text with fenced code blocks removed. */
function proseOnly(src) {
  const out = [];
  let fenced = false;
  for (const line of src.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    out.push(fenced ? "" : line);
  }
  return out.join("\n");
}

// A branch name in the documented convention, e.g. `docs/GH-92_API-Documentation`.
const BRANCH_NAME = /^(feat|fix|chore|docs|refactor|release)\/GH-\d+_/;

const PATH_RE =
  /`((?:\.claude|docs|scripts|apps|packages|supabase|\.github)\/[A-Za-z0-9._/-]+)`/g;
const SCRIPT_RE = /`pnpm (?:run )?([a-z][a-z0-9:-]*)`/g;
// pnpm's own subcommands, which are not package scripts.
const PNPM_BUILTINS = new Set([
  "install",
  "add",
  "remove",
  "update",
  "audit",
  "dlx",
  "exec",
  "why",
  "up",
  "outdated",
  "list",
  "link",
  "publish",
  "pack",
  "store",
  "prune",
]);

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter((f) => f.endsWith(".md"))
  .filter((f) => f === "CLAUDE.md" || f.startsWith(".claude/"));

if (files.length === 0) {
  throw new Error(
    "no instruction files matched -- refusing to report a clean result",
  );
}

const scripts = new Set(
  Object.keys(JSON.parse(readFileSync("package.json", "utf8")).scripts),
);

const citedPaths = [];
const badScripts = [];
for (const file of files) {
  const prose = proseOnly(readFileSync(file, "utf8"));
  for (const m of prose.matchAll(PATH_RE)) {
    const p = m[1];
    if (p.includes("*") || BRANCH_NAME.test(p)) continue;
    if (!existsSync(p)) citedPaths.push([file, p]);
  }
  for (const m of prose.matchAll(SCRIPT_RE)) {
    const s = m[1];
    if (PNPM_BUILTINS.has(s) || scripts.has(s)) continue;
    badScripts.push([file, s]);
  }
}

const ignored = ignoredPaths([...new Set(citedPaths.map(([, p]) => p))]);
const badPaths = citedPaths.filter(([, p]) => !ignored.has(p));

for (const [file, p] of badPaths) {
  console.error(`${file}: cites \`${p}\`, which does not exist.`);
}
for (const [file, s] of badScripts) {
  console.error(
    `${file}: cites \`pnpm ${s}\`, which is not a script in package.json.`,
  );
}

const total = badPaths.length + badScripts.length;
if (total > 0) {
  console.error(
    `\n${total} instruction(s) pointing at something that is not there.`,
  );
  process.exit(1);
}
console.log(
  `Instruction files cite only things that exist (${files.length} file(s) checked).`,
);
