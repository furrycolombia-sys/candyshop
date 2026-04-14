import { describe, it, expect } from "vitest";

import { validateDelegateInput } from "./validation";

describe("validateDelegateInput", () => {
  it("accepts valid input with a single permission", () => {
    expect(() =>
      validateDelegateInput("seller-1", "admin-1", ["orders.approve"]),
    ).not.toThrow();
  });

  it("accepts valid input with all permissions", () => {
    expect(() =>
      validateDelegateInput("seller-1", "admin-1", [
        "orders.approve",
        "orders.request_proof",
      ]),
    ).not.toThrow();
  });

  it("throws when sellerId equals adminUserId (self-delegation)", () => {
    expect(() =>
      validateDelegateInput("user-1", "user-1", ["orders.approve"]),
    ).toThrow("Cannot delegate to yourself");
  });

  it("throws when permissions array is empty", () => {
    expect(() => validateDelegateInput("seller-1", "admin-1", [])).toThrow(
      "At least one permission is required",
    );
  });

  it("throws when a permission value is invalid", () => {
    expect(() =>
      validateDelegateInput("seller-1", "admin-1", [
        "orders.approve",
        "invalid.perm" as never,
      ]),
    ).toThrow("Invalid permission: invalid.perm");
  });
});
