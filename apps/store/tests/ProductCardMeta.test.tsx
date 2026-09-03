import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { Product } from "@/features/products/domain/types";
import { ProductCardMeta } from "@/features/products/presentation/components/ProductCardMeta";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    slug: "test",
    name_en: "Test",
    name_es: "Test",
    description_en: "",
    description_es: "",
    type: "merch",
    category: "merch",
    price: 25,
    currency: "USD",
    max_quantity: null,
    is_active: true,
    created_at: "2025-01-01",
    event_id: null,
    long_description_en: "",
    long_description_es: "",
    tagline_en: "",
    tagline_es: "",
    compare_at_price: null,
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

describe("ProductCardMeta", () => {
  it("renders digital label for digital products", () => {
    render(<ProductCardMeta product={makeProduct({ type: "digital" })} />);
    expect(screen.getByTestId("product-meta-digital")).toHaveTextContent(
      "digital",
    );
  });

  it("does not render digital label for non-digital products", () => {
    render(<ProductCardMeta product={makeProduct({ type: "merch" })} />);
    expect(screen.queryByTestId("product-meta-digital")).toBeNull();
  });

  it("renders out of stock when max_quantity is 0", () => {
    render(<ProductCardMeta product={makeProduct({ max_quantity: 0 })} />);
    expect(screen.getByTestId("product-meta-stock")).toHaveTextContent(
      "outOfStock",
    );
  });

  it("renders stock left when max_quantity is positive", () => {
    render(<ProductCardMeta product={makeProduct({ max_quantity: 5 })} />);
    expect(screen.getByTestId("product-meta-stock")).toHaveTextContent(
      "stockLeft:5",
    );
  });

  it("renders nothing for stock when max_quantity is null", () => {
    render(<ProductCardMeta product={makeProduct({ max_quantity: null })} />);
    // One assertion, not two: with max_quantity null the stock paragraph is
    // not rendered at all, so "no outOfStock" and "no stockLeft" were the same
    // fact checked twice through its text.
    expect(screen.queryByTestId("product-meta-stock")).toBeNull();
  });
});
