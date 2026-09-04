#!/usr/bin/env node
/**
 * Reports two accessibility defects that keep recurring, before axe has to.
 *
 * Both were found by the page-level axe suites, and both turned out to be a
 * shape repeated across files rather than a one-off:
 *
 *   same-colour-on-tint  `bg-X/10 text-X` puts a colour on a tint of itself.
 *                        Measured at 3.2:1 on a role badge and 1.72:1 on an
 *                        audit badge, against a required 4.5:1. Five
 *                        components had it.
 *   unnamed-control      a select or input with no aria-label, no id for a
 *                        label to point at, and no placeholder. Eleven of
 *                        these were live across two report filter bars, and a
 *                        screen reader announced them as unnamed fields.
 *
 * Advisory, not a gate: a wrapping <label> is a legitimate way to name a
 * control and this cannot see one, so a clean axe run is the authority. It
 * exists to find the next instance in a diff rather than four CI rounds later.
 *
 * Usage:
 *   node scripts/check-a11y-patterns.mjs
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// No quoted glob: execSync goes through cmd.exe on Windows, which does not
// strip the quotes, so git receives them literally and matches nothing. This
// scan reported "0 problems" twice that way before anyone noticed it was
// reading no files at all.
const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /^apps\/[^/]+\/src\/.*\.tsx$/.test(f));
if (files.length === 0) {
  throw new Error("scan matched no files -- refusing to report a clean result");
}
console.log(`scanning ${files.length} files`);

// Multi-line aware: JSX opening tags routinely span many lines.
const tagRe = /<(select|input)\b([\s\S]*?)\/?>/g;
const sameColour = /bg-([a-z]+)\/\d+\s+text-\1\b/g;

let colour = 0;
let unnamed = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(sameColour)) {
    console.log(`same-colour-on-tint  ${f}  ${m[0]}`);
    colour++;
  }
  for (const m of src.matchAll(tagRe)) {
    const attrs = m[2];
    if (/type="(hidden|submit|button)"/.test(attrs)) continue;
    if (/aria-label|aria-labelledby|placeholder=|(?<!test)\bid=/.test(attrs))
      continue;
    const line = src.slice(0, m.index).split("\n").length;
    console.log(`unnamed-control      ${f}:${line}`);
    unnamed++;
  }
}
console.log(`\nsame-colour-on-tint: ${colour}   unnamed controls: ${unnamed}`);
