/**
 * Tests for scripts/lib/sql-statement.mjs
 */

import { describe, it, expect } from "vitest";

import { isRowReturningStatement } from "../lib/sql-statement.mjs";

describe("isRowReturningStatement", () => {
  it("treats a SELECT as row-returning", () => {
    expect(isRowReturningStatement("SELECT 1")).toBe(true);
  });

  it("treats a TRUNCATE as not row-returning", () => {
    // The direct-Postgres path wraps row-returning SQL in json_agg(). Wrapping
    // a TRUNCATE produces a syntax error, so the restore's single up-front
    // truncate must be recognised as returning nothing.
    expect(
      isRowReturningStatement('TRUNCATE "orders" RESTART IDENTITY CASCADE'),
    ).toBe(false);
  });

  it("ignores leading whitespace and comments", () => {
    expect(isRowReturningStatement("\n  -- wipe it\n  truncate foo")).toBe(
      false,
    );
  });
});
