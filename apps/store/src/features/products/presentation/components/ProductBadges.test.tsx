import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import type { Product } from "@/features/products/domain/types";
import { ProductBadges } from "@/features/products/presentation/components/ProductBadges";

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
    price_cop: 100_000,
    price_usd: 25,
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

const identity = (key: string) => key;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProductBadges", () => {
  it("renders category badge", () => {
    render(
      <ProductBadges
        product={makeProduct()}
        categoryColor="bg-pink"
        tCategories={identity}
        tTypes={identity}
        t={identity}
      />,
    );
    expect(screen.getByTestId("product-card-category")).toHaveTextContent(
      "merch",
    );
  });

  it("renders type badge", () => {
    render(
      <ProductBadges
        product={makeProduct({ type: "digital" })}
        categoryColor="bg-pink"
        tCategories={identity}
        tTypes={identity}
        t={identity}
      />,
    );
    expect(screen.getByTestId("product-card-type")).toHaveTextContent(
      "digital",
    );
  });

  it("renders refundable badge when refundable is true", () => {
    render(
      <ProductBadges
        product={makeProduct({ refundable: true })}
        categoryColor="bg-pink"
        tCategories={identity}
        tTypes={identity}
        t={identity}
      />,
    );
    expect(screen.getByText("refundable")).toBeInTheDocument();
  });

  it("renders non-refundable badge when refundable is false", () => {
    render(
      <ProductBadges
        product={makeProduct({ refundable: false })}
        categoryColor="bg-pink"
        tCategories={identity}
        tTypes={identity}
        t={identity}
      />,
    );
    expect(screen.getByText("nonRefundable")).toBeInTheDocument();
  });

  it("does not render refund badge when refundable is null", () => {
    render(
      <ProductBadges
        product={makeProduct({ refundable: null })}
        categoryColor="bg-pink"
        tCategories={identity}
        tTypes={identity}
        t={identity}
      />,
    );
    expect(screen.queryByText("refundable")).toBeNull();
    expect(screen.queryByText("nonRefundable")).toBeNull();
  });
});
