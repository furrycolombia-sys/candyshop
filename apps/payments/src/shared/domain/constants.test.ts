import { describe, it, expect } from "vitest";

import {
  ACCEPTED_RECEIPT_MIME_TYPES,
  ACCEPTED_RECEIPT_TYPES,
  CART_COOKIE_CHANGED_EVENT,
  CART_COOKIE_KEY,
  FALLBACK_BUYER_NAME,
  FALLBACK_SELLER_NAME,
  MAX_RECEIPT_SIZE_BYTES,
  RECEIPTS_BUCKET,
  RECEIPT_URL_TTL_SECONDS,
} from "./constants";

describe("shared domain constants", () => {
  it("FALLBACK_SELLER_NAME is a non-empty string", () => {
    expect(typeof FALLBACK_SELLER_NAME).toBe("string");
    expect(FALLBACK_SELLER_NAME.length).toBeGreaterThan(0);
  });

  it("FALLBACK_BUYER_NAME is a non-empty string", () => {
    expect(typeof FALLBACK_BUYER_NAME).toBe("string");
    expect(FALLBACK_BUYER_NAME.length).toBeGreaterThan(0);
  });

  it("cart constants are stable", () => {
    expect(CART_COOKIE_KEY).toBe("candystore-cart");
    expect(CART_COOKIE_CHANGED_EVENT).toBe("candystore:cart-cookie-changed");
  });

  it("receipt constants are centralized", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(ACCEPTED_RECEIPT_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(ACCEPTED_RECEIPT_TYPES).toBe("image/jpeg,image/png,image/webp");
    expect(RECEIPTS_BUCKET).toBe("receipts");
    expect(RECEIPT_URL_TTL_SECONDS).toBe(3600);
  });
});
