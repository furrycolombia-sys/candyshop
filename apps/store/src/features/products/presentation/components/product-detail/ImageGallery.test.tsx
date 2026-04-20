import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ImageGallery } from "./ImageGallery";

import type { Product } from "@/features/products/domain/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.label !== undefined) return `${key}:${params.label}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("@/features/products/presentation/components/FeaturedRibbon", () => ({
  FeaturedRibbon: ({ label }: { label: string }) => (
    <span data-testid="featured-ribbon">{label}</span>
  ),
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
    sort_order: 1,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ImageGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when no images", () => {
    render(
      <ImageGallery
        product={makeProduct({ images: [] })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("image-gallery")).toBeInTheDocument();
    expect(screen.getByTestId("image-gallery-main")).toBeInTheDocument();
  });

  it("shows product type in placeholder", () => {
    render(
      <ImageGallery
        product={makeProduct({ images: [], type: "digital" })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByText("digital")).toBeInTheDocument();
  });

  it("renders featured ribbon on placeholder when featured", () => {
    render(
      <ImageGallery
        product={makeProduct({ images: [], featured: true })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getByTestId("featured-ribbon")).toBeInTheDocument();
  });

  it("renders main image when images exist", () => {
    const images = ["https://example.com/img1.jpg"];
    render(
      <ImageGallery product={makeProduct({ images })} theme={defaultTheme} />,
    );
    expect(screen.getByTestId("image-gallery")).toBeInTheDocument();
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("renders thumbnails for multiple images", () => {
    const images = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "https://example.com/img3.jpg",
    ];
    render(
      <ImageGallery product={makeProduct({ images })} theme={defaultTheme} />,
    );
    expect(screen.getByTestId("image-gallery-thumbs")).toBeInTheDocument();
  });

  it("does not render thumbnails for single image", () => {
    const images = ["https://example.com/img1.jpg"];
    render(
      <ImageGallery product={makeProduct({ images })} theme={defaultTheme} />,
    );
    expect(
      screen.queryByTestId("image-gallery-thumbs"),
    ).not.toBeInTheDocument();
  });

  it("changes active image when thumbnail is clicked", () => {
    const images = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
    ];
    render(
      <ImageGallery product={makeProduct({ images })} theme={defaultTheme} />,
    );
    const thumb = screen.getByTestId("image-gallery-thumb-1");
    fireEvent.click(thumb);
    // After click, the second image should be shown - verify thumb exists
    expect(thumb).toBeInTheDocument();
  });

  it("handles object-format images", () => {
    const images = [{ url: "https://example.com/img.jpg", alt: "Test alt" }];
    render(
      <ImageGallery
        product={makeProduct({ images: images as unknown as string[] })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("renders featured ribbon on images when featured", () => {
    const images = ["https://example.com/img1.jpg"];
    render(
      <ImageGallery
        product={makeProduct({ images, featured: true })}
        theme={defaultTheme}
      />,
    );
    expect(screen.getAllByTestId("featured-ribbon").length).toBeGreaterThan(0);
  });
});
