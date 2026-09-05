import { describe, expect, it } from "vitest";

import { extractSymbols, findStale } from "../lib/doc-freshness.mjs";

const sym = (code) => extractSymbols(code, "a.ts");

describe("extractSymbols", () => {
  it("pairs an exported symbol with its doc", () => {
    const out = sym(
      `/** Adds. */\nexport function add(a, b) { return a + b; }`,
    );
    expect(out.get("add").doc).toBe("/** Adds. */");
    expect(out.get("add").code).toContain("return a + b;");
  });

  it("collapses whitespace runs so re-indenting is not a change", () => {
    const a = sym(`/** Adds. */\nexport function add(a, b) { return a + b; }`);
    const b = sym(
      `/** Adds. */\nexport function add(a, b) {\n\n      return a + b;\n}`,
    );
    expect(a.get("add").code).toBe(b.get("add").code);
  });

  it("ignores symbols that are not exported", () => {
    expect(sym(`function hidden() {}`).has("hidden")).toBe(false);
  });

  it("names an exported const", () => {
    expect(sym(`/** N. */\nexport const N = 1;`).has("N")).toBe(true);
  });
});

describe("findStale", () => {
  it("reports a documented symbol whose code moved but whose doc did not", () => {
    const before = sym(
      `/** Returns null when missing. */\nexport function get() { return null; }`,
    );
    const after = sym(
      `/** Returns null when missing. */\nexport function get() { throw new Error("missing"); }`,
    );
    expect(findStale(before, after).map((s) => s.name)).toEqual(["get"]);
  });

  it("stays quiet when the doc moved with the code", () => {
    const before = sym(
      `/** Returns null. */\nexport function get() { return null; }`,
    );
    const after = sym(
      `/** Throws when missing. */\nexport function get() { throw new Error("x"); }`,
    );
    expect(findStale(before, after)).toEqual([]);
  });

  it("stays quiet when only indentation changed", () => {
    const before = sym(
      `/** Adds. */\nexport function add(a, b) { return a + b; }`,
    );
    const after = sym(
      `/** Adds. */\nexport function add(a, b) {\n    return a + b;\n}`,
    );
    expect(findStale(before, after)).toEqual([]);
  });

  it("ignores added and deleted symbols", () => {
    const before = sym(`/** A. */\nexport const a = 1;`);
    const after = sym(`/** B. */\nexport const b = 2;`);
    expect(findStale(before, after)).toEqual([]);
  });

  // The deliberate divergence from AeleOS, which enforces jsdoc/require-jsdoc
  // and so can read "" === "" as "the doc did not move". Libra documents about
  // a third of its exports; without this rule the check would fire on every
  // undocumented export anyone edited -- a coverage mandate wearing a
  // freshness check's name.
  it("ignores a symbol that was undocumented before and after", () => {
    const before = sym(`export function raw() { return 1; }`);
    const after = sym(`export function raw() { return 2; }`);
    expect(findStale(before, after)).toEqual([]);
  });

  // Without this, "delete the doc" is the suppression flag the header says
  // this check deliberately does not offer.
  it("reports a doc deleted while the code changed", () => {
    const before = sym(`/** Adds. */\nexport function add() { return 1; }`);
    const after = sym(`export function add() { return 2; }`);
    expect(findStale(before, after).map((s) => s.name)).toEqual(["add"]);
  });

  it("stays quiet when a doc is deleted but the code did not move", () => {
    const before = sym(`/** Adds. */\nexport const a = 1;`);
    const after = sym(`export const a = 1;`);
    expect(findStale(before, after)).toEqual([]);
  });
});
