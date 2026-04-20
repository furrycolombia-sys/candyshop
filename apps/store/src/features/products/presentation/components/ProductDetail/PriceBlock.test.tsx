import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { PriceBlock } from "./PriceBlock";

import type { Product } from "@/features/products/domain/types";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nPrice: (product: Record<string, unknown>, locale: string) => {
    const price = locale === "en" ? product.price_usd : product.price_cop;
    return `$${price}`;
  },
  i18nCurrencyCode: (_product: unknown, locale: string) =>
    locale === "en" ? "USD" : "COP",
}));

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

describe("PriceBlock", () => {
  const discountLabel = ({ amount }: { amount: string }) => `Save ${amount}`;

  it("renders price", () => {
    render(
      <PriceBlock product={makeProduct()} discountLabel={discountLabel} />,
    );
    expect(screen.getByTestId("hero-price")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
  });

  it("renders USD label for English locale", () => {
    render(
      <PriceBlock product={makeProduct()} discountLabel={discountLabel} />,
    );
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders compare-at price when discount exists", () => {
    const product = makeProduct({
      price_usd: 20,
      compare_at_price_usd: 30,
    });
    render(<PriceBlock product={product} discountLabel={discountLabel} />);
    // Should show both current and compare price
    expect(screen.getByText("$20")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
  });

  it("renders discount label when discount exists", () => {
    const product = makeProduct({
      price_usd: 20,
      compare_at_price_usd: 30,
    });
    render(<PriceBlock product={product} discountLabel={discountLabel} />);
    expect(screen.getByText("Save $10")).toBeInTheDocument();
  });

  it("does not render compare-at price when no discount", () => {
    render(
      <PriceBlock product={makeProduct()} discountLabel={discountLabel} />,
    );
    // Only the current price should be shown
    const prices = screen.getAllByText(/\$/);
    expect(prices).toHaveLength(1);
  });
});
