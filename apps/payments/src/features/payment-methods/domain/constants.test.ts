import { describe, it, expect } from "vitest";

import { PAYMENT_METHODS_QUERY_KEY } from "./constants";

describe("payment-methods domain constants", () => {
  it("defines PAYMENT_METHODS_QUERY_KEY", () => {
    expect(PAYMENT_METHODS_QUERY_KEY).toBe("seller-payment-methods");
  });
});
