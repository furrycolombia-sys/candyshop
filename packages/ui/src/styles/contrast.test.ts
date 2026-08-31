/**
 * WCAG contrast enforcement for the theme's status colours.
 *
 * `.claude/rules/tailwind.md` states the AA ratios this project holds itself
 * to, and asks that every token pair be verified. Nothing verified them, and
 * two pairs did not meet them: white on `--success` (3.53:1) and white on
 * `--warning` (3.34:1), both below the 4.5:1 normal text requires. The second
 * was found by an axe check on landing's home page; the first had simply not
 * been rendered on a page anyone scanned yet.
 *
 * This reads the real token values out of colors.css, so it fails on the
 * change rather than after it ships.
 */
import fs from "node:fs";
import path from "node:path";

import { converter, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";

const CSS = fs.readFileSync(path.join(__dirname, "colors.css"), "utf8");

/** WCAG 2.1 AA, normal text. Large text (>=18.66px bold or >=24px) needs 3.0. */
const AA_NORMAL_TEXT = 4.5;

/** Pairs a fill token with the token meant to be drawn on top of it. */
const PAIRS = [
  ["background", "foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["destructive", "destructive-foreground"],
  ["success", "success-foreground"],
  ["warning", "warning-foreground"],
  ["info", "info-foreground"],
] as const;

const toRgb = converter("rgb");

/**
 * colors.css declares light theme in `:root` and dark in `.dark`. Read each
 * block separately: a token defined in both must be judged in its own theme.
 */
function themeBlock(selector: string): string {
  const start = CSS.indexOf(selector);
  if (start === -1) throw new Error(`no ${selector} block in colors.css`);
  const open = CSS.indexOf("{", start);
  const close = CSS.indexOf("\n}", open);
  return CSS.slice(open, close);
}

function readToken(block: string, name: string): string | null {
  const match = new RegExp(String.raw`--${name}:\s*([^;]+);`).exec(block);
  if (!match?.[1]) return null;
  const value = match[1].trim();
  // Follow one level of indirection: `--sidebar: var(--surface)`.
  if (value.startsWith("var(")) {
    const inner = /var\(--([\w-]+)\)/.exec(value)?.[1];
    return inner ? readToken(block, inner) : null;
  }
  return value;
}

function contrast(block: string, bg: string, fg: string): number | null {
  const bgValue = readToken(block, bg);
  const fgValue = readToken(block, fg);
  if (!bgValue || !fgValue) return null;

  const bgColor = toRgb(bgValue);
  const fgColor = toRgb(fgValue);
  if (!bgColor || !fgColor) return null;

  return wcagContrast(bgColor, fgColor);
}

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s theme contrast", (_themeName, selector) => {
  const block = themeBlock(selector);

  it.each(PAIRS)("%s / %s meets WCAG AA for normal text", (bg, fg) => {
    const ratio = contrast(block, bg, fg);

    // A pair absent from this block is inherited from :root, so the light
    // theme's own assertion already covers it. Anything else -- a token that
    // exists but cannot be parsed -- must fail rather than skip, or this file
    // becomes the thing it was written to prevent.
    expect(
      ratio,
      `--${fg} on --${bg} could not be read from colors.css`,
    ).not.toBeNull();

    expect(
      Number(ratio!.toFixed(2)),
      `--${fg} on --${bg} is ${ratio!.toFixed(2)}:1, below ${AA_NORMAL_TEXT}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe("the check itself", () => {
  it("rejects a pair that fails", () => {
    // White on the old --warning fill: the exact defect this file exists to
    // stop. Without this, a passing suite would not prove the maths runs.
    const ratio = wcagContrast(
      toRgb("oklch(0.65 0.17 68)")!,
      toRgb("oklch(1 0 0)")!,
    );

    expect(ratio).toBeLessThan(AA_NORMAL_TEXT);
  });
});
