import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Product } from "@/features/products/domain/types";
import { ProductGrid } from "@/features/products/presentation/components/ProductGrid";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/features/products/application/hooks/useGridCols", () => ({
  useGridCols: () => 3,
}));

vi.mock("@/features/products/application/buildGridOrder", () => ({
  buildGridOrder: (products: Product[]) => products,
}));

vi.mock("@/features/products/presentation/components/ProductCard", () => ({
  ProductCard: ({
    product,
    variant,
  }: {
    product: Product;
    variant?: string;
  }) => (
    <div data-testid="product-card" data-variant={variant ?? "default"}>
      {product.name_en}
    </div>
  ),
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

describe("ProductGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when products array is empty", () => {
    render(<ProductGrid products={[]} />);
    expect(screen.getByTestId("product-grid-empty")).toBeInTheDocument();
  });

  it("renders the grid when products are provided", () => {
    const products = [
      makeProduct({ id: "1", name_en: "A" }),
      makeProduct({ id: "2", name_en: "B" }),
    ];
    render(<ProductGrid products={products} />);

    expect(screen.getByTestId("product-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
  });

  it("renders featured products with col-span-full", () => {
    const products = [
      makeProduct({ id: "f1", name_en: "Featured", featured: true }),
    ];
    render(<ProductGrid products={products} />);

    const card = screen.getByTestId("product-card");
    expect(card).toHaveAttribute("data-variant", "featured");
  });

  it("renders non-featured products with default variant", () => {
    const products = [
      makeProduct({ id: "n1", name_en: "Normal", featured: false }),
    ];
    render(<ProductGrid products={products} />);

    const card = screen.getByTestId("product-card");
    expect(card).toHaveAttribute("data-variant", "default");
  });
});
