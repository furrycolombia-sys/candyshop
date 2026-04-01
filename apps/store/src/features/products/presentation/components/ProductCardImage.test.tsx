import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import type { Product } from "@/features/products/domain/types";
import { ProductCardImage } from "@/features/products/presentation/components/ProductCardImage";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

vi.mock("@/features/products/presentation/components/FeaturedRibbon", () => ({
  FeaturedRibbon: () => <div data-testid="featured-ribbon" />,
}));

vi.mock("@/shared/domain/categoryConstants", () => ({
  getCategoryTheme: () => ({ accent: "--pink" }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p-1",
    slug: "test",
    name_en: "Test Product",
    name_es: "Producto",
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProductCardImage", () => {
  it("renders the image container", () => {
    render(
      <ProductCardImage
        product={makeProduct()}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
      />,
    );
    expect(screen.getByTestId("product-card-image")).toBeInTheDocument();
  });

  it("renders a next/image when product has images", () => {
    const product = makeProduct({
      images: [{ url: "https://example.com/img.jpg", alt: "test" }],
    });
    render(
      <ProductCardImage
        product={product}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
      />,
    );
    expect(screen.getByTestId("next-image")).toBeInTheDocument();
  });

  it("renders type label when no images", () => {
    render(
      <ProductCardImage
        product={makeProduct({ images: [] })}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
      />,
    );
    expect(screen.getByText("MERCH")).toBeInTheDocument();
  });

  it("renders featured ribbon when product is featured", () => {
    render(
      <ProductCardImage
        product={makeProduct({ featured: true })}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={true}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
      />,
    );
    expect(screen.getByTestId("featured-ribbon")).toBeInTheDocument();
  });

  it("does not render featured ribbon when not featured", () => {
    render(
      <ProductCardImage
        product={makeProduct({ featured: false })}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
      />,
    );
    expect(screen.queryByTestId("featured-ribbon")).toBeNull();
  });

  it("shows in-cart stamp when quantityInCart > 0", () => {
    render(
      <ProductCardImage
        product={makeProduct()}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
        quantityInCart={2}
        inCartLabel="In cart"
      />,
    );
    expect(screen.getByTestId("product-card-in-cart")).toHaveTextContent(
      "In cart",
    );
  });

  it("does not show in-cart stamp when quantityInCart is 0", () => {
    render(
      <ProductCardImage
        product={makeProduct()}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Out of stock"
        typeLabel="MERCH"
        quantityInCart={0}
        inCartLabel="In cart"
      />,
    );
    expect(screen.queryByTestId("product-card-in-cart")).toBeNull();
  });

  it("shows out of stock overlay when product is not available", () => {
    render(
      <ProductCardImage
        product={makeProduct({ is_active: false })}
        categoryColor="var(--pink)"
        categoryForeground="var(--candy-text)"
        isFeatured={false}
        featuredLabel="Featured"
        outOfStockLabel="Sold Out"
        typeLabel="MERCH"
      />,
    );
    expect(screen.getByText("Sold Out")).toBeInTheDocument();
  });
});
