import { describe, it, expect } from "vitest";

import { AUDIT_ACTION_TYPES, AUDIT_PAGE_SIZE } from "./constants";

describe("audit domain constants", () => {
  it("exports AUDIT_PAGE_SIZE as 50", () => {
    expect(AUDIT_PAGE_SIZE).toBe(50);
  });

  it("exports the three valid action types", () => {
    expect(AUDIT_ACTION_TYPES).toEqual(["INSERT", "UPDATE", "DELETE"]);
  });

  it("AUDIT_ACTION_TYPES is a readonly tuple", () => {
    expect(AUDIT_ACTION_TYPES).toHaveLength(3);
  });
});
