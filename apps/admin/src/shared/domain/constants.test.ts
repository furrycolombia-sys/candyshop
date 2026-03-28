import { describe, it, expect } from "vitest";

import { AUDIT_ACTION_COLORS } from "./constants";

describe("shared domain constants", () => {
  it("exports AUDIT_ACTION_COLORS with INSERT, UPDATE, DELETE keys", () => {
    expect(AUDIT_ACTION_COLORS).toHaveProperty("INSERT");
    expect(AUDIT_ACTION_COLORS).toHaveProperty("UPDATE");
    expect(AUDIT_ACTION_COLORS).toHaveProperty("DELETE");
  });

  it("INSERT color includes mint", () => {
    expect(AUDIT_ACTION_COLORS.INSERT).toContain("mint");
  });

  it("UPDATE color includes sky", () => {
    expect(AUDIT_ACTION_COLORS.UPDATE).toContain("sky");
  });

  it("DELETE color includes peach", () => {
    expect(AUDIT_ACTION_COLORS.DELETE).toContain("peach");
  });
});
