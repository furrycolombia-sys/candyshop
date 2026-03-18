#!/usr/bin/env node
/**
 * CSS Sync Checker
 *
 * Ensures globals.css files are synchronized across all apps.
 * The only allowed differences are:
 * - Comments
 * - The @source directive path (varies by app location)
 * - Blocks wrapped in @css-sync-ignore-start / @css-sync-ignore-end markers
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Apps to check
const APPS = ["store", "landing", "payments", "admin"];
const CSS_PATH = "src/app/globals.css";

// Lines to ignore when comparing (regex patterns)
const IGNORE_PATTERNS = [
  /^\/\*.*\*\/$/,         // Single-line comments
  /^\/\*/,                // Start of multi-line comment
  /^\*\//,                // End of multi-line comment
  /^\s*\*/,               // Middle of multi-line comment
  /^@source\s+/,          // @source directive (path varies by app)
  /^\s*$/,                // Empty lines
];

// Markers for app-specific CSS blocks that should be excluded from sync comparison
const SYNC_IGNORE_START = "@css-sync-ignore-start";
const SYNC_IGNORE_END = "@css-sync-ignore-end";

function shouldIgnoreLine(line) {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(line.trim()));
}

function stripIgnoredBlocks(content) {
  const lines = content.split("\n");
  const result = [];
  let ignoring = false;

  for (const line of lines) {
    if (line.includes(SYNC_IGNORE_START)) {
      ignoring = true;
      continue;
    }
    if (line.includes(SYNC_IGNORE_END)) {
      ignoring = false;
      continue;
    }
    if (!ignoring) {
      result.push(line);
    }
  }

  return result.join("\n");
}

function normalizeCSS(content) {
  return stripIgnoredBlocks(content)
    .split("\n")
    .filter((line) => !shouldIgnoreLine(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function checkCSSSync() {
  console.log("Checking CSS sync across apps...\n");

  const cssContents = {};
  const errors = [];

  // Read all CSS files
  for (const app of APPS) {
    const cssPath = resolve(ROOT, "apps", app, CSS_PATH);

    if (!existsSync(cssPath)) {
      errors.push(`Missing CSS file: apps/${app}/${CSS_PATH}`);
      continue;
    }

    const content = readFileSync(cssPath, "utf-8");
    cssContents[app] = {
      raw: content,
      normalized: normalizeCSS(content),
    };

    // Check for @source directive
    if (!content.includes("@source")) {
      errors.push(
        `Missing @source directive in apps/${app}/${CSS_PATH}\n` +
          `  Add: @source "../../../../packages/ui/src/**/*.{ts,tsx}";`
      );
    }
  }

  // Compare normalized content
  const appNames = Object.keys(cssContents);
  if (appNames.length >= 2) {
    const reference = cssContents[appNames[0]].normalized;
    const referenceApp = appNames[0];

    for (let i = 1; i < appNames.length; i++) {
      const app = appNames[i];
      const content = cssContents[app].normalized;

      if (content !== reference) {
        errors.push(
          `CSS mismatch between apps/${referenceApp}/${CSS_PATH} and apps/${app}/${CSS_PATH}`
        );

        // Find specific differences
        const refLines = reference.split("\n");
        const appLines = content.split("\n");

        const maxLines = Math.max(refLines.length, appLines.length);
        const diffs = [];

        for (let j = 0; j < maxLines; j++) {
          const refLine = refLines[j] || "(missing)";
          const appLine = appLines[j] || "(missing)";

          if (refLine !== appLine) {
            diffs.push(`  Line ${j + 1}:`);
            diffs.push(`    ${referenceApp}: ${refLine}`);
            diffs.push(`    ${app}: ${appLine}`);
          }
        }

        if (diffs.length > 0) {
          errors.push("Differences:\n" + diffs.slice(0, 30).join("\n"));
          if (diffs.length > 30) {
            errors.push(`  ... and ${Math.floor((diffs.length - 30) / 3)} more differences`);
          }
        }
      }
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error("CSS Sync Check FAILED\n");
    for (const error of errors) {
      console.error(`  ${error}\n`);
    }
    console.error("\nSee .claude/rules/css-consistency.md for guidelines.");
    process.exit(1);
  }

  console.log(`CSS files are in sync across ${APPS.length} apps.`);
  console.log("  - " + APPS.map((app) => `apps/${app}/${CSS_PATH}`).join("\n  - "));
  process.exit(0);
}

checkCSSSync();
