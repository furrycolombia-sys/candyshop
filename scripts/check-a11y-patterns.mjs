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
 *   unnamed-control      a select, input or textarea with no aria-label, no id
 *                        for a label to point at, no placeholder, and no
 *                        wrapping label. Eleven were live across two report
 *                        filter bars, announced as unnamed fields.
 *
 * Advisory, not a gate. The wrapping-label test below is a guess, so a clean
 * axe run is the authority; this exists to find the next instance in a diff
 * rather than four CI rounds later.
 *
 * Usage:
 *   node scripts/check-a11y-patterns.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// No quoted glob: execSync goes through cmd.exe on Windows, which does not
// strip the quotes, so git receives them literally and matches nothing. This
// scan reported "0 problems" twice that way, while four unlabelled inputs sat
// in a file it claimed to have read.
const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /^apps\/[^/]+\/src\/.*\.tsx$/.test(f));

if (files.length === 0) {
  throw new Error("scan matched no files -- refusing to report a clean result");
}

const tagRe = /<(select|input|textarea)\b/g;
const sameColour = /bg-([a-z]+)\/\d+\s+text-\1\b/g;

/**
 * The attributes of a JSX opening tag, read by brace depth rather than regex.
 *
 * A non-greedy match stops at the first `>` it meets, and `onChange={(e) =>
 * ...}` contains one -- so the attribute text came back truncated and a
 * `placeholder` further down the tag went unseen. Every control with a handler
 * written before its labelling attribute read as unnamed.
 */
function openingTagAttrs(src, from) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return src.slice(from, i);
  }
  return null;
}

/** A control wrapped in its own <label> is named by it. Approximated by
 *  looking back for an unclosed <label>, which is the guess that keeps this
 *  advisory. */
function isWrappedInLabel(before) {
  return before.lastIndexOf("<label") > before.lastIndexOf("</label>");
}

let colour = 0;
let unnamed = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");

  for (const m of src.matchAll(sameColour)) {
    console.log(`same-colour-on-tint  ${file}  ${m[0]}`);
    colour++;
  }

  for (const m of src.matchAll(tagRe)) {
    const attrs = openingTagAttrs(src, m.index + m[0].length);
    if (attrs === null) continue;
    if (/type="(hidden|submit|button)"/.test(attrs)) continue;
    if (/aria-label|aria-labelledby|placeholder=|(?<!test)\bid=/.test(attrs)) {
      continue;
    }
    // A generic wrapper spreads its caller's props, so its name arrives from
    // the call site. AutoTextarea does exactly this and all nine of its
    // callers pass one -- flagging the definition would be reporting the
    // wrong file.
    if (/\{\.\.\.\w+\}/.test(attrs)) continue;

    const before = src.slice(0, m.index);
    if (isWrappedInLabel(before)) continue;

    console.log(`unnamed-control      ${file}:${before.split("\n").length}`);
    unnamed++;
  }
}

console.log(
  `\nscanned ${files.length} files -- same-colour-on-tint: ${colour}, unnamed controls: ${unnamed}`,
);
