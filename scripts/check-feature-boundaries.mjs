#!/usr/bin/env node
/**
 * Holds the line on cross-feature imports.
 *
 * `.claude/rules/architecture.md` states it as a MUST: "Features MUST NOT
 * import directly from other features", with cross-feature communication going
 * through shared interfaces, stores, or events. There are 13 that do.
 *
 * This is a ratchet, not a clean-up. Each of those 13 needs a decision that
 * is bigger than an import statement -- three of the pairs import each other,
 * which usually means they are one feature wearing two names -- and making
 * that call is not something a lint sweep should do. What this prevents is a
 * fourteenth arriving while nobody is looking.
 *
 * It also replaced a claim in docs/standards/quality-gates.md that the feature
 * barrel rule "is inconsistent with itself", evidenced by 126 deep imports
 * against 6 barrel imports. That comparison counted imports *within* a feature,
 * which the rule never asked to go through a barrel. Split by who is importing,
 * routes used the barrel 31 times and bypassed it 7; those 7 are fixed, and the
 * figure is now 38 to 0.
 *
 * Usage:
 *   node scripts/check-feature-boundaries.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * What the codebase had when this check was written. It may fall; it may not
 * rise. Lower it when a pair is resolved -- that is the ratchet.
 */
const BASELINE = 10;

const FEATURE_IMPORT = /from\s+"(@\/features\/([^/"]+)([^"]*))"/g;

function featureFiles() {
  const out = execSync("git ls-files", { encoding: "utf-8" })
    .split("\n")
    .filter((f) => /^apps\/[^/]+\/src\/features\/.*\.tsx?$/.test(f));
  if (out.length === 0) {
    throw new Error(
      "no feature files matched -- refusing to report a clean result",
    );
  }
  return out;
}

function crossFeatureImports() {
  const found = new Map();
  for (const file of featureFiles()) {
    const owner = /^apps\/[^/]+\/src\/features\/([^/]+)\//.exec(file)[1];
    const app = /^apps\/([^/]+)\//.exec(file)[1];
    for (const m of readFileSync(file, "utf-8").matchAll(FEATURE_IMPORT)) {
      const [, specifier, target] = m;
      if (target === owner) continue;
      const pair = `${app}: ${owner} -> ${target}`;
      if (!found.has(pair)) found.set(pair, new Set());
      found.get(pair).add(specifier);
    }
  }
  return found;
}

function main() {
  const found = crossFeatureImports();
  const total = [...found.values()].reduce((n, s) => n + s.size, 0);

  for (const [pair, specifiers] of [...found].sort()) {
    console.log(`  ${String(specifiers.size).padStart(2)}  ${pair}`);
  }

  if (total > BASELINE) {
    console.error(
      `\n${total} cross-feature imports, up from a baseline of ${BASELINE}.` +
        "\n\nFeatures must not import each other (.claude/rules/architecture.md)." +
        "\nMove what is shared into shared/domain, or lift the dependency into" +
        "\nthe route that composes both.\n",
    );
    process.exit(1);
  }

  console.log(
    `\n${total} cross-feature imports, baseline ${BASELINE}.` +
      (total < BASELINE
        ? " Lower BASELINE in this file to lock the improvement in."
        : " No new ones."),
  );
}

main();
