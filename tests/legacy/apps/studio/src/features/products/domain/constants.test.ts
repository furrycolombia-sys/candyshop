import { describe, it, expect } from "vitest";

import {
  PRODUCTS_QUERY_KEY,
  PRODUCT_TYPES,
  PRODUCT_CATEGORIES,
  CATEGORY_COLOR_MAP,
  TYPE_COLOR_MAP,
  SECTION_I18N_NAMESPACE,
  SECTION_DROPPABLE_ID,
  ITEM_DROPPABLE_PREFIX,
  PRODUCT_FORM_DEFAULTS,
} from "./constants";

describe("products domain constants", () => {
  it("defines PRODUCTS_QUERY_KEY", () => {
    expect(PRODUCTS_QUERY_KEY).toBe("products");
  });

  it("defines all product types", () => {
    expect(PRODUCT_TYPES).toEqual(["merch", "digital", "service", "ticket"]);
    expect(PRODUCT_TYPES).toHaveLength(4);
  });

  it("defines all product categories", () => {
    expect(PRODUCT_CATEGORIES).toEqual([
      "fursuits",
      "merch",
      "art",
      "events",
      "digital",
      "deals",
    ]);
    expect(PRODUCT_CATEGORIES).toHaveLength(6);
  });

  it("maps every category to a color", () => {
    for (const category of PRODUCT_CATEGORIES) {
      expect(CATEGORY_COLOR_MAP[category]).toBeDefined();
      expect(CATEGORY_COLOR_MAP[category]).toHaveProperty("backgroundColor");
      expect(CATEGORY_COLOR_MAP[category]).toHaveProperty("color");
    }
  });

  it("maps every type to a color", () => {
    for (const type of PRODUCT_TYPES) {
      expect(TYPE_COLOR_MAP[type]).toBeDefined();
      expect(TYPE_COLOR_MAP[type]).toHaveProperty("backgroundColor");
      expect(TYPE_COLOR_MAP[type]).toHaveProperty("color");
    }
  });

  it("defines section i18n namespace", () => {
    expect(SECTION_I18N_NAMESPACE).toBe("form.inlineEditor.sections");
  });

  it("defines section droppable ID", () => {
    expect(SECTION_DROPPABLE_ID).toBe("sections");
  });

  it("defines item droppable prefix", () => {
    expect(ITEM_DROPPABLE_PREFIX).toBe("section-items-");
  });

  describe("PRODUCT_FORM_DEFAULTS", () => {
    it("has empty name fields", () => {
      expect(PRODUCT_FORM_DEFAULTS.name_en).toBe("");
      expect(PRODUCT_FORM_DEFAULTS.name_es).toBe("");
    });

    it("has default type and category", () => {
      expect(PRODUCT_FORM_DEFAULTS.type).toBe("merch");
      expect(PRODUCT_FORM_DEFAULTS.category).toBe("merch");
    });

    it("has zero price", () => {
      expect(PRODUCT_FORM_DEFAULTS.price).toBe(0);
    });

    it("has default currency", () => {
      expect(PRODUCT_FORM_DEFAULTS.currency).toBe("USD");
    });

    it("has empty arrays for images and sections", () => {
      expect(PRODUCT_FORM_DEFAULTS.images).toEqual([]);
      expect(PRODUCT_FORM_DEFAULTS.sections).toEqual([]);
    });

    it("has is_active true and featured false by default", () => {
      expect(PRODUCT_FORM_DEFAULTS.is_active).toBe(true);
      expect(PRODUCT_FORM_DEFAULTS.featured).toBe(false);
    });

    it("has null for nullable fields", () => {
      expect(PRODUCT_FORM_DEFAULTS.compare_at_price).toBeNull();
      expect(PRODUCT_FORM_DEFAULTS.max_quantity).toBeNull();
      expect(PRODUCT_FORM_DEFAULTS.refundable).toBeNull();
    });
  });
});
