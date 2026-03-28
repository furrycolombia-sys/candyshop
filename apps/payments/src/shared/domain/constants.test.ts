import { describe, it, expect } from "vitest";

import { FALLBACK_BUYER_NAME, FALLBACK_SELLER_NAME } from "./constants";

describe("shared domain constants", () => {
  it("FALLBACK_SELLER_NAME is a non-empty string", () => {
    expect(typeof FALLBACK_SELLER_NAME).toBe("string");
    expect(FALLBACK_SELLER_NAME.length).toBeGreaterThan(0);
  });

  it("FALLBACK_BUYER_NAME is a non-empty string", () => {
    expect(typeof FALLBACK_BUYER_NAME).toBe("string");
    expect(FALLBACK_BUYER_NAME.length).toBeGreaterThan(0);
  });
});
