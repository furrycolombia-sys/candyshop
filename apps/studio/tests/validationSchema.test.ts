import { describe, it, expect } from "vitest";

import {
  createProductFormSchema,
  productImageSchema,
} from "@/features/products/domain/validationSchema";

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
      price: 10_000,
      currency: "COP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name_en", () => {
    const result = schema.safeParse({
      name_en: "",
      type: "merch",
      category: "merch",
      price: 10_000,
      currency: "COP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero price", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price: 0,
      currency: "COP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price: -100,
      currency: "COP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "invalid",
      category: "merch",
      price: 10_000,
      currency: "COP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "invalid",
      price: 10_000,
      currency: "COP",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid types", () => {
    for (const type of ["merch", "digital", "service", "ticket"]) {
      const result = schema.safeParse({
        name_en: "Test",
        type,
        category: "merch",
        price: 1000,
        currency: "USD",
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
        price: 1000,
        currency: "USD",
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults optional fields correctly", () => {
    const result = schema.safeParse({
      name_en: "Test",
      type: "merch",
      category: "merch",
      price: 1000,
      currency: "USD",
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

const baseProduct = {
  name_en: "Test Product",
  type: "merch" as const,
  category: "merch" as const,
  price: 10_000,
  currency: "COP",
};

const validItem = { title_en: "Item Title", title_es: "" };
const validSection = {
  name_en: "Section Name",
  name_es: "",
  items: [validItem],
};

describe("createProductFormSchema — section validation", () => {
  const schema = createProductFormSchema(mockT);

  it("accepts a product with a valid section", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [validSection],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a section with no name (both name_en and name_es empty)", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [{ name_en: "", name_es: "", items: [validItem] }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a section with only name_es set", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [{ name_en: "", name_es: "Nombre", items: [validItem] }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a section with no items", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [{ name_en: "Section", name_es: "", items: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe("createProductFormSchema — section item validation", () => {
  const schema = createProductFormSchema(mockT);

  it("rejects a section item with no title (both title_en and title_es empty)", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [
        {
          ...validSection,
          items: [{ title_en: "", title_es: "" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a section item with only title_es set", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [
        {
          ...validSection,
          items: [{ title_en: "", title_es: "Título en español" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a section item with only title_en set", () => {
    const result = schema.safeParse({
      ...baseProduct,
      sections: [
        {
          ...validSection,
          items: [{ title_en: "English title", title_es: "" }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
