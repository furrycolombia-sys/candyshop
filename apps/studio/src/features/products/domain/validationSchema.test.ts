/* eslint-disable vitest/no-conditional-expect */
import { describe, it, expect } from "vitest";

import {
  createProductFormSchema,
  productImageSchema,
} from "./validationSchema";

const mockT = (key: string) => key;

describe("productImageSchema", () => {
  it("accepts a valid image", () => {
    const result = productImageSchema.safeParse({
      url: "https://example.com/img.png",
      alt: "A test image",
      sort_order: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid URL", () => {
    const result = productImageSchema.safeParse({
      url: "not-a-url",
      alt: "",
      sort_order: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative sort_order", () => {
    const result = productImageSchema.safeParse({
      url: "https://example.com/img.png",
      alt: "",
      sort_order: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("createProductFormSchema", () => {
  const schema = createProductFormSchema(mockT);

  it("validates a minimal valid product", () => {
    const result = schema.safeParse({
      name_en: "Test Product",
      type: "merch",
      category: "merch",
      price_cop: 10_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name_en", () => {
    const result = schema.safeParse({
      name_en: "",
      type: "merch",
      category: "merch",
      price_cop: 10_000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero price_cop", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price_cop: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price_cop", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price_cop: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "invalid",
      category: "merch",
      price_cop: 10_000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "invalid",
      price_cop: 10_000,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid types", () => {
    for (const type of ["merch", "digital", "service", "ticket"]) {
      const result = schema.safeParse({
        name_en: "Test",
        type,
        category: "merch",
        price_cop: 1000,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid categories", () => {
    for (const category of [
      "fursuits",
      "merch",
      "art",
      "events",
      "digital",
      "deals",
    ]) {
      const result = schema.safeParse({
        name_en: "Test",
        type: "merch",
        category,
        price_cop: 1000,
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults optional fields correctly", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price_cop: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(false);
      expect(result.data.is_active).toBe(true);
      expect(result.data.images).toEqual([]);
      expect(result.data.sections).toEqual([]);
    }
  });
});
