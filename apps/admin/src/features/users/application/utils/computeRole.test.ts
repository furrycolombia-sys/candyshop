import { describe, expect, it } from "vitest";

import { computeRole } from "./computeRole";

import {
  ALL_PERMISSION_KEYS,
  PERMISSION_TEMPLATES,
} from "@/features/users/domain/constants";

describe("computeRole", () => {
  it("returns 'none' when no keys are provided", () => {
    expect(computeRole([])).toBe("none");
  });

  it("returns 'admin' when all permission keys are present", () => {
    expect(computeRole(ALL_PERMISSION_KEYS)).toBe("admin");
  });

  it("returns 'seller' when exactly seller permission keys are present", () => {
    const sellerKeys = [...new Set(PERMISSION_TEMPLATES.seller)];
    expect(computeRole(sellerKeys)).toBe("seller");
  });

  it("returns 'seller' when extra keys are present but all seller keys are granted", () => {
    const sellerKeys = [...new Set(PERMISSION_TEMPLATES.seller), "random.key"];
    expect(computeRole(sellerKeys)).toBe("seller");
  });

  it("returns 'buyer' when buyer permission keys are present", () => {
    expect(computeRole(PERMISSION_TEMPLATES.buyer)).toBe("buyer");
  });

  it("returns 'custom' when partial or unknown permission keys are present", () => {
    expect(computeRole(["products.read", "orders.read"])).toBe("custom");
  });
});
