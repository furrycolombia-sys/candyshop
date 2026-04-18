import { describe, it, expect } from "vitest";

import { i18nPrice } from "./i18nPrice";

const product = { price_usd: 45, price_cop: 185_000 };

describe("i18nPrice", () => {
  it("returns USD-formatted price for English locale", () => {
    const result = i18nPrice(product, "en");
    expect(result).toMatch(/\$45/);
    expect(result).toContain("45");
  });

  it("returns COP-formatted price for Spanish locale", () => {
    const result = i18nPrice(product, "es");
    expect(result).toContain("185");
    expect(result).toMatch(/COP|cop|\$|185\.000/i);
  });

  it("falls back to English/USD for an unknown locale", () => {
    const result = i18nPrice(product, "fr");
    expect(result).toMatch(/\$45/);
    expect(result).toContain("45");
  });

  it("formats zero price correctly for English", () => {
    const result = i18nPrice({ price_usd: 0, price_cop: 0 }, "en");
    expect(result).toMatch(/\$0/);
  });

  it("formats zero price correctly for Spanish", () => {
    const result = i18nPrice({ price_usd: 0, price_cop: 0 }, "es");
    expect(result).toContain("0");
  });

  it("falls back to COP when USD is 0 and COP is non-zero (en locale)", () => {
    const result = i18nPrice({ price_usd: 0, price_cop: 185_000 }, "en");
    expect(result).toContain("185");
    expect(result).toMatch(/COP|185\.000/i);
  });

  it("falls back to USD when COP is 0 and USD is non-zero (es locale)", () => {
    const result = i18nPrice({ price_usd: 25, price_cop: 0 }, "es");
    expect(result).toMatch(/\$25/);
  });

  it("shows locale price when both are non-zero (en locale picks USD)", () => {
    const result = i18nPrice({ price_usd: 25, price_cop: 185_000 }, "en");
    expect(result).toMatch(/\$25/);
  });

  it("shows locale price when both are non-zero (es locale picks COP)", () => {
    const result = i18nPrice({ price_usd: 25, price_cop: 185_000 }, "es");
    expect(result).toContain("185");
  });
});
