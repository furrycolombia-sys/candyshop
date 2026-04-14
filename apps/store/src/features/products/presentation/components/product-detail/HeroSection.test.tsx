import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { HeroSection } from "./HeroSection";

import { useAddToCart } from "@/features/cart/application/hooks/useAddToCart";
import type { Product } from "@/features/products/domain/types";

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
    if (params?.rating !== undefined) return `${key}:${params.rating}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock("@/features/cart/application/hooks/useAddToCart", () => ({
  useAddToCart: vi.fn(() => ({
    added: false,
    quantityInCart: 0,
    hasReachedStockLimit: false,
    handleAddToCart: mockHandleAddToCart,
  })),
}));

vi.mock("./ImageGallery", () => ({
  ImageGallery: () => <div data-testid="image-gallery-mock" />,
}));

vi.mock("./PriceBlock", () => ({
  PriceBlock: () => <div data-testid="price-block-mock" />,
}));

vi.mock("./RatingStars", () => ({
  RatingStars: () => <div data-testid="rating-stars-mock" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultTheme = {
  bg: "var(--mint)",
  bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
  border: "var(--mint)",
  text: "var(--mint)",
  badgeBg: "var(--mint)",
  rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
  rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
  foreground: "var(--candy-text)",
  accent: "--mint",
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "test-product",
    name_en: "Test Product",
    name_es: "Producto",
    tagline_en: "Cool tagline",
    tagline_es: "Slogan genial",
    description_en: "A great product",
    description_es: "Un gran producto",
    long_description_en: "",
    long_description_es: "",
    type: "merch",
    category: "merch",
    price_cop: 100_000,
    price_usd: 25,
    compare_at_price_cop: null,
    compare_at_price_usd: null,
    max_quantity: null,
    is_active: true,
    featured: false,
    sort_order: 1,
    images: [],
    tags: ["cool", "new"],
    rating: 4.5,
    review_count: 10,
    refundable: true,
    sections: [],
    seller_id: "seller-1",
    event_id: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  } as Product;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeroSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product name", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByTestId("hero-name")).toHaveTextContent("Test Product");
  });

  it("renders tagline when present", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByTestId("hero-tagline")).toHaveTextContent(
      "Cool tagline",
    );
  });

  it("does not render tagline when empty", () => {
    render(
      <HeroSection
        product={makeProduct({ tagline_en: "" })}
        theme={defaultTheme}
      />,
    );
    expect(screen.queryByTestId("hero-tagline")).not.toBeInTheDocument();
  });

  it("renders category and type badges", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByTestId("hero-category")).toBeInTheDocument();
    expect(screen.getByTestId("hero-type")).toBeInTheDocument();
  });

  it("renders in-stock badge for available product", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByText("inStock")).toBeInTheDocument();
  });

  it("renders out-of-stock badge for unavailable product", () => {
    render(
      <HeroSection
        product={makeProduct({ is_active: false })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByText("outOfStock")).toBeInTheDocument();
  });

  it("renders refundable badge when refundable is true", () => {
    render(
      <HeroSection
        product={makeProduct({ refundable: true })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("hero-refundable")).toBeInTheDocument();
  });

  it("renders non-refundable badge when refundable is false", () => {
    render(
      <HeroSection
        product={makeProduct({ refundable: false })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("hero-non-refundable")).toBeInTheDocument();
  });

  it("renders rating when present", () => {
    render(
      <HeroSection
        product={makeProduct({ rating: 4.5, review_count: 10 })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("hero-rating")).toBeInTheDocument();
  });

  it("does not render rating when review_count is 0", () => {
    render(
      <HeroSection
        product={makeProduct({ rating: 4.5, review_count: 0 })}
        theme={defaultTheme}
      />,
    );
    expect(screen.queryByTestId("hero-rating")).not.toBeInTheDocument();
  });

  it("renders description", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByTestId("hero-description")).toHaveTextContent(
      "A great product",
    );
  });

  it("renders tags", () => {
    render(
      <HeroSection
        product={makeProduct({ tags: ["cool", "new"] })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByText("#cool")).toBeInTheDocument();
    expect(screen.getByText("#new")).toBeInTheDocument();
  });

  it("does not render tags when empty", () => {
    render(
      <HeroSection product={makeProduct({ tags: [] })} theme={defaultTheme} />,
    );
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
  });

  it("renders add-to-cart button and calls handler on click", () => {
    render(<HeroSection product={makeProduct()} theme={defaultTheme} />);
    const btn = screen.getByTestId("hero-add-to-cart");
    fireEvent.click(btn);
    expect(mockHandleAddToCart).toHaveBeenCalledTimes(1);
  });

  it("disables add-to-cart when product is unavailable", () => {
    render(
      <HeroSection
        product={makeProduct({ is_active: false })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("hero-add-to-cart")).toBeDisabled();
  });

  it("disables add-to-cart when the cart already reached the stock limit", () => {
    vi.mocked(useAddToCart).mockReturnValue({
      added: false,
      quantityInCart: 1,
      hasReachedStockLimit: true,
      handleAddToCart: mockHandleAddToCart,
    });

    render(
      <HeroSection
        product={makeProduct({ max_quantity: 1 })}
        theme={defaultTheme}
      />,
    );

    expect(screen.getByTestId("hero-add-to-cart")).toBeDisabled();
  });
});
