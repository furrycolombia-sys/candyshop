import { describe, it, expect } from "vitest";

import {
  PAYMENT_METHODS_QUERY_KEY,
  SELLER_PAYMENT_METHOD_DEFAULTS,
} from "./constants";

describe("payment-methods domain constants", () => {
  it("defines PAYMENT_METHODS_QUERY_KEY", () => {
    expect(PAYMENT_METHODS_QUERY_KEY).toBe("seller-payment-methods");
  });

  describe("SELLER_PAYMENT_METHOD_DEFAULTS", () => {
    it("has empty type_id", () => {
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.type_id).toBe("");
    });

    it("has empty account details", () => {
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.account_details_en).toBe("");
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.account_details_es).toBe("");
    });

    it("has empty seller notes", () => {
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.seller_note_en).toBe("");
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.seller_note_es).toBe("");
    });

    it("has is_active true by default", () => {
      expect(SELLER_PAYMENT_METHOD_DEFAULTS.is_active).toBe(true);
    });
  });
});
