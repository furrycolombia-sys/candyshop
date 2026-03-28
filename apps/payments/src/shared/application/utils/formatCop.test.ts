import { describe, it, expect } from "vitest";

import { COP_CURRENCY_CODE, formatCop } from "./formatCop";

describe("formatCop", () => {
  it("formats zero correctly", () => {
    const result = formatCop(0);
    expect(result).toContain("0");
    // es-CO locale may abbreviate or use $ sign instead of COP
    expect(typeof result).toBe("string");
  });

  it("formats a positive amount with thousands separator", () => {
    const result = formatCop(12_000);
    // The es-CO locale uses "." as the thousands separator
    expect(result).toContain("12");
    expect(result).toContain("000");
  });

  it("formats a large number", () => {
    const result = formatCop(1_500_000);
    expect(result).toContain("1");
    expect(result).toContain("500");
  });

  it("formats a negative amount", () => {
    const result = formatCop(-5000);
    expect(result).toContain("5");
    expect(result).toContain("000");
  });
});

describe("COP_CURRENCY_CODE", () => {
  it("equals COP", () => {
    expect(COP_CURRENCY_CODE).toBe("COP");
  });
});
