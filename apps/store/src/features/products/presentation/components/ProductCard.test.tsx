import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Product } from "@/features/products/domain/types";
import { ProductCard } from "@/features/products/presentation/components/ProductCard";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockHandleAddToCart = vi.fn(
  (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
  },
);

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("@/shared/infrastructure/i18n", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/application/hooks/useAddToCart", () => ({
  useAddToCart: () => ({
    added: false,
    quantityInCart: 0,
    handleAddToCart: mockHandleAddToCart,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "test-product-1",
    slug: "test-product",
    name_en: "Cool Fursuit",
    name_es: "Traje Genial",
    description_en: "A really cool fursuit",
    description_es: "Un traje genial",
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

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product name", () => {
    const product = makeProduct({ name_en: "My Product" });
    render(<ProductCard product={product} />);

    expect(screen.getByTestId("product-card-name")).toHaveTextContent(
      "My Product",
    );
  });

  it("renders product price", () => {
    const product = makeProduct({ price_usd: 25 });
    render(<ProductCard product={product} />);

    expect(screen.getByTestId("product-card-price")).toBeInTheDocument();
  });

  it("renders product card article element", () => {
    render(<ProductCard product={makeProduct()} />);

    expect(screen.getByTestId("product-card")).toBeInTheDocument();
  });

  it("renders add to cart button", () => {
    render(<ProductCard product={makeProduct()} />);

    expect(screen.getByTestId("product-card-add-to-cart")).toBeInTheDocument();
  });

  it("calls handleAddToCart when add to cart button is clicked", () => {
    render(<ProductCard product={makeProduct()} />);

    const button = screen.getByTestId("product-card-add-to-cart");
    fireEvent.click(button);

    expect(mockHandleAddToCart).toHaveBeenCalledTimes(1);
  });

  it("renders as default variant by default", () => {
    render(<ProductCard product={makeProduct()} />);

    expect(screen.getByTestId("product-card")).toHaveAttribute(
      "data-variant",
      "default",
    );
  });

  it("renders as featured variant when specified", () => {
    render(<ProductCard product={makeProduct()} variant="featured" />);

    expect(screen.getByTestId("product-card")).toHaveAttribute(
      "data-variant",
      "featured",
    );
  });

  it("disables add to cart when product is not active", () => {
    const product = makeProduct({ is_active: false });
    // Re-mock useAddToCart to reflect disabled state from isProductAvailable
    // The actual disabled state is computed in the component from isProductAvailable
    render(<ProductCard product={product} />);

    const button = screen.getByTestId("product-card-add-to-cart");
    expect(button).toBeDisabled();
  });

  it("disables add to cart when product is out of stock", () => {
    const product = makeProduct({ max_quantity: 0 });
    render(<ProductCard product={product} />);

    const button = screen.getByTestId("product-card-add-to-cart");
    expect(button).toBeDisabled();
  });

  it("renders a link to the product detail page", () => {
    const product = makeProduct({ id: "abc-123", name_en: "Test Prod" });
    render(<ProductCard product={product} />);

    const link = screen.getByTestId("product-card-link");
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/products/abc-123/"),
    );
  });

  it("sets data-product-id attribute", () => {
    const product = makeProduct({ id: "prod-42" });
    render(<ProductCard product={product} />);

    expect(screen.getByTestId("product-card")).toHaveAttribute(
      "data-product-id",
      "prod-42",
    );
  });
});
