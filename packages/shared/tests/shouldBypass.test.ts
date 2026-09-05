import { describe, expect, it } from "vitest";

import { shouldBypass } from "@shared/i18n/shouldBypass";

describe("shouldBypass", () => {
  it("stands aside for Next's own assets", () => {
    expect(shouldBypass("/_next/static/chunk.js")).toBe(true);
  });

  it("stands aside for API routes", () => {
    expect(shouldBypass("/api/checkout/orders")).toBe(true);
    expect(shouldBypass("/api")).toBe(true);
  });

  // `startsWith("/api")` also matched any first segment beginning with those
  // four letters, silently skipping locale routing for it.
  it("does not stand aside for a route that merely starts with api", () => {
    expect(shouldBypass("/apiary")).toBe(false);
    expect(shouldBypass("/en/apiary")).toBe(false);
  });

  it("stands aside for static files", () => {
    expect(shouldBypass("/logo.png")).toBe(true);
    expect(shouldBypass("/favicon.ico")).toBe(true);
    expect(shouldBypass("/en/robots.txt")).toBe(true);
  });

  it("handles locale-prefixed pages", () => {
    expect(shouldBypass("/en")).toBe(false);
    expect(shouldBypass("/en/products")).toBe(false);
    expect(shouldBypass("/es/checkout")).toBe(false);
  });

  it("handles an unprefixed page, which is what needs the redirect", () => {
    expect(shouldBypass("/")).toBe(false);
    expect(shouldBypass("/products")).toBe(false);
  });

  // The dot test is deliberately loose, and safe because slugify() replaces
  // every character outside [a-z0-9] with a hyphen, so no generated product
  // link can contain one.
  it("stands aside for a dotted path, which no generated link produces", () => {
    expect(shouldBypass("/en/products/id/vol.2")).toBe(true);
  });

  it("does not stand aside for a slugified product path", () => {
    expect(
      shouldBypass("/en/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/vol-2"),
    ).toBe(false);
  });
});
