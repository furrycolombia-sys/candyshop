import { describe, it, expect } from "vitest";

import { getDisplayName } from "@/features/seller-admins/domain/utils";

describe("getDisplayName", () => {
  it("returns display_name when present", () => {
    expect(
      getDisplayName({ display_name: "Jane", email: "jane@example.com" }),
    ).toBe("Jane");
  });

  it("falls back to email when display_name is null", () => {
    expect(
      getDisplayName({ display_name: null, email: "jane@example.com" }),
    ).toBe("jane@example.com");
  });
});
