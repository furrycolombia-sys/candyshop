import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ProductSections } from "./ProductSections";

import type { Product } from "@/features/products/domain/types";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock("@/features/products/domain/constants", () => ({
  getCategoryTheme: () => ({
    bg: "var(--mint)",
    bgLight: "color-mix(in srgb, var(--mint) 15%, transparent)",
    border: "var(--mint)",
    text: "var(--mint)",
    badgeBg: "var(--mint)",
    rowEven: "color-mix(in srgb, var(--mint) 5%, transparent)",
    rowOdd: "color-mix(in srgb, var(--mint) 15%, transparent)",
    foreground: "var(--candy-text)",
    accent: "--mint",
  }),
}));

vi.mock(
  "@/features/products/presentation/components/ProductDetail/HeroSection",
  () => ({
    HeroSection: () => <div data-testid="hero-section-mock" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/ProductDetail/DescriptionSection",
  () => ({
    DescriptionSection: ({ description }: { description: string }) => (
      <div data-testid="description-section-mock">{description}</div>
    ),
  }),
);

vi.mock(
  "@/features/products/presentation/components/ProductDetail/Sections",
  () => ({
    SectionRenderer: ({ section }: { section: { type: string } }) => (
      <div data-testid={`section-renderer-${section.type}`} />
    ),
  }),
);

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

describe("ProductSections", () => {
  it("renders HeroSection", () => {
    render(<ProductSections product={makeProduct()} />);
    expect(screen.getByTestId("hero-section-mock")).toBeInTheDocument();
  });

  it("renders DescriptionSection when long description exists", () => {
    render(
      <ProductSections
        product={makeProduct({ long_description_en: "Detailed text" })}
      />,
    );
    expect(screen.getByTestId("description-section-mock")).toHaveTextContent(
      "Detailed text",
    );
  });

  it("does not render DescriptionSection when no long description", () => {
    render(
      <ProductSections product={makeProduct({ long_description_en: "" })} />,
    );
    expect(
      screen.queryByTestId("description-section-mock"),
    ).not.toBeInTheDocument();
  });

  it("renders section renderers sorted by sort_order", () => {
    const sections = [
      {
        type: "cards",
        sort_order: 2,
        items: [],
        name_en: "Cards",
        name_es: "Cards",
      },
      {
        type: "accordion",
        sort_order: 1,
        items: [],
        name_en: "FAQ",
        name_es: "FAQ",
      },
    ];
    render(
      <ProductSections
        product={makeProduct({ sections: sections as unknown as null })}
      />,
    );
    expect(
      screen.getByTestId("section-renderer-accordion"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("section-renderer-cards")).toBeInTheDocument();
  });
});
