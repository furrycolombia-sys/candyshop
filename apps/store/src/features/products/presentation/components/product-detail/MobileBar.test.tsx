import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MobileBar } from "./MobileBar";

import type { Product } from "@/features/products/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nPrice: () => "$25",
}));

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
    slug: "test",
    name_en: "Test",
    name_es: "Test",
    tagline_en: "",
    tagline_es: "",
    description_en: "",
    description_es: "",
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
    sort_order: 0,
    images: [],
    tags: [],
    rating: null,
    review_count: 0,
    refundable: null,
    sections: [],
    seller_id: null,
    event_id: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  } as Product;
}

describe("MobileBar", () => {
  const onAddToCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders price", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    expect(screen.getByTestId("product-detail-mobile-bar")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
  });

  it("renders add-to-cart button", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    expect(
      screen.getByTestId("product-detail-mobile-add-to-cart"),
    ).toBeInTheDocument();
    expect(screen.getByText("addToCart")).toBeInTheDocument();
  });

  it("shows addedToCart text when added", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={true}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={1}
      />,
    );
    expect(screen.getByText("addedToCart")).toBeInTheDocument();
  });

  it("shows in-cart count when quantityInCart > 0", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={3}
      />,
    );
    expect(screen.getByText("inCart:3")).toBeInTheDocument();
  });

  it("does not show in-cart when quantityInCart is 0", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    expect(screen.queryByText(/inCart/)).not.toBeInTheDocument();
  });

  it("calls onAddToCart when button clicked", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    fireEvent.click(screen.getByTestId("product-detail-mobile-add-to-cart"));
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it("disables button when product is unavailable", () => {
    render(
      <MobileBar
        product={makeProduct({ is_active: false })}
        added={false}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    expect(
      screen.getByTestId("product-detail-mobile-add-to-cart"),
    ).toBeDisabled();
  });

  it("disables button when already added", () => {
    render(
      <MobileBar
        product={makeProduct()}
        added={true}
        onAddToCart={onAddToCart}
        theme={defaultTheme}
        quantityInCart={0}
      />,
    );
    expect(
      screen.getByTestId("product-detail-mobile-add-to-cart"),
    ).toBeDisabled();
  });
});
