import { describe, it, expect } from "vitest";

import { formatPrice } from "./formatPrice";

describe("formatPrice", () => {
  it("formats USD amount", () => {
    const result = formatPrice(45, "USD");
    expect(typeof result).toBe("string");
    expect(result).toContain("45");
  });

  it("formats COP amount with thousands separator", () => {
    const result = formatPrice(185_000, "COP");
    expect(result).toContain("185");
    expect(result).toContain("000");
  });

  it("formats zero in USD", () => {
    const result = formatPrice(0, "USD");
    expect(result).toContain("0");
    expect(typeof result).toBe("string");
  });

  it("formats EUR amount", () => {
    const result = formatPrice(99, "EUR");
    expect(typeof result).toBe("string");
    expect(result).toContain("99");
  });
});
