import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { MobileBarWithCart } from "./MobileBarWithCart";

import type { Product } from "@/features/products/domain/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nPrice: () => "$25",
}));

vi.mock("@/shared/application/hooks/useAddToCart", () => ({
  useAddToCart: () => ({
    added: false,
    quantityInCart: 0,
    handleAddToCart: vi.fn(),
  }),
}));

const defaultTheme = {
  bg: "bg-mint",
  bgLight: "bg-mint/15",
  border: "border-mint",
  text: "text-mint",
  badgeBg: "bg-mint",
  rowEven: "bg-mint/5",
  rowOdd: "bg-mint/15",
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

describe("MobileBarWithCart", () => {
  it("renders MobileBar with cart hook connected", () => {
    render(<MobileBarWithCart product={makeProduct()} theme={defaultTheme} />);
    expect(screen.getByTestId("product-detail-mobile-bar")).toBeInTheDocument();
  });
});
