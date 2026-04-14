import { describe, it, expect } from "vitest";

import { isProductAvailable } from "@/features/products/domain/types";
import type { Product } from "@/features/products/domain/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-id",
    slug: "test-slug",
    name_en: "Test",
    name_es: "Prueba",
    description_en: "",
    description_es: "",
    type: "merch",
    category: "merch",
    price_cop: 0,
    price_usd: 10,
    max_quantity: null,
    is_active: true,
    created_at: "2025-01-01",
    event_id: null,
    long_description_en: "",
    long_description_es: "",
    tagline_en: "",
    tagline_es: "",
    compare_at_price_cop: null,
    compare_at_price_usd: null,
    tags: [],
    rating: null,
    review_count: 0,
    images: [],
    sections: [],
    updated_at: "2025-01-01",
    featured: false,
    seller_id: null,
    refundable: null,
    sort_order: 0,
    ...overrides,
  } as Product;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isProductAvailable", () => {
  it("returns true when product is active and has no quantity limit", () => {
    const product = makeProduct({ is_active: true, max_quantity: null });
    expect(isProductAvailable(product)).toBe(true);
  });

  it("returns true when product is active and has stock remaining", () => {
    const product = makeProduct({ is_active: true, max_quantity: 5 });
    expect(isProductAvailable(product)).toBe(true);
  });

  it("returns false when product is not active", () => {
    const product = makeProduct({ is_active: false, max_quantity: null });
    expect(isProductAvailable(product)).toBe(false);
  });

  it("returns false when product is not active even with stock", () => {
    const product = makeProduct({ is_active: false, max_quantity: 10 });
    expect(isProductAvailable(product)).toBe(false);
  });

  it("returns false when max_quantity is 0 (out of stock)", () => {
    const product = makeProduct({ is_active: true, max_quantity: 0 });
    expect(isProductAvailable(product)).toBe(false);
  });

  it("returns true when max_quantity is 1 (last item)", () => {
    const product = makeProduct({ is_active: true, max_quantity: 1 });
    expect(isProductAvailable(product)).toBe(true);
  });
});
