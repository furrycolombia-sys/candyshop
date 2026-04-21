import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { GalleryOverlays } from "./GalleryOverlays";

import type { Product } from "@/features/products/domain/types";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
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
    price: 25,
    currency: "USD",
    compare_at_price: null,
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

describe("GalleryOverlays", () => {
  const mockT = (key: string) => key;

  it("renders counter", () => {
    render(
      <GalleryOverlays
        product={makeProduct()}
        theme={defaultTheme}
        activeView={{ label: "Front", index: 0 }}
        activeIndex={0}
        totalViews={3}
        t={mockT}
      />,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("renders view label", () => {
    render(
      <GalleryOverlays
        product={makeProduct()}
        theme={defaultTheme}
        activeView={{ label: "Back View", index: 1 }}
        activeIndex={1}
        totalViews={5}
        t={mockT}
      />,
    );
    expect(screen.getByText("Back View")).toBeInTheDocument();
  });

  it("renders featured badge when product is featured", () => {
    render(
      <GalleryOverlays
        product={makeProduct({ featured: true })}
        theme={defaultTheme}
        activeView={undefined}
        activeIndex={0}
        totalViews={1}
        t={mockT}
      />,
    );
    expect(screen.getByTestId("hero-featured-badge")).toBeInTheDocument();
  });

  it("does not render featured badge when not featured", () => {
    render(
      <GalleryOverlays
        product={makeProduct({ featured: false })}
        theme={defaultTheme}
        activeView={undefined}
        activeIndex={0}
        totalViews={1}
        t={mockT}
      />,
    );
    expect(screen.queryByTestId("hero-featured-badge")).not.toBeInTheDocument();
  });

  it("renders out-of-stock overlay when product is unavailable", () => {
    render(
      <GalleryOverlays
        product={makeProduct({ is_active: false })}
        theme={defaultTheme}
        activeView={undefined}
        activeIndex={0}
        totalViews={1}
        t={mockT}
      />,
    );
    expect(screen.getByText("outOfStock")).toBeInTheDocument();
  });

  it("does not render out-of-stock overlay when product is available", () => {
    render(
      <GalleryOverlays
        product={makeProduct({ is_active: true })}
        theme={defaultTheme}
        activeView={undefined}
        activeIndex={0}
        totalViews={1}
        t={mockT}
      />,
    );
    expect(screen.queryByText("outOfStock")).not.toBeInTheDocument();
  });
});
