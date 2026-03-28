import { describe, it, expect } from "vitest";

import {
  ACCEPTED_RECEIPT_TYPES,
  CART_COOKIE_KEY,
  MAX_RECEIPT_SIZE_BYTES,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  ORDER_EXPIRY_HOURS,
  RECEIPTS_BUCKET,
  SECONDS_PER_MINUTE,
} from "./constants";

describe("checkout domain constants", () => {
  it("CART_COOKIE_KEY is a non-empty string", () => {
    expect(CART_COOKIE_KEY).toBe("candystore-cart");
  });

  it("MAX_RECEIPT_SIZE_BYTES is 5 MB", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("ACCEPTED_RECEIPT_TYPES accepts images", () => {
    expect(ACCEPTED_RECEIPT_TYPES).toBe("image/*");
  });

  it("RECEIPTS_BUCKET is defined", () => {
    expect(RECEIPTS_BUCKET).toBe("receipts");
  });

  it("ORDER_EXPIRY_HOURS is 48", () => {
    expect(ORDER_EXPIRY_HOURS).toBe(48);
  });

  it("time conversion constants are correct", () => {
    expect(MINUTES_PER_HOUR).toBe(60);
    expect(SECONDS_PER_MINUTE).toBe(60);
    expect(MS_PER_SECOND).toBe(1000);
  });
});
