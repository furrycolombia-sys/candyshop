import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { GallerySection } from "./GallerySection";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock
    <img src={src} alt={alt} data-testid="next-image" />
  ),
}));

const theme = {
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

describe("GallerySection", () => {
  it("renders section title", () => {
    const section = {
      type: "gallery",
      sort_order: 0,
      name_en: "Gallery",
      name_es: "Galeria",
      items: [
        {
          sort_order: 0,
          title_en: "Photo 1",
          title_es: "Foto 1",
          description_en: "",
          description_es: "",
          icon: null,
          image_url: "https://example.com/img.jpg",
        },
      ],
    };
    render(<GallerySection section={section as never} theme={theme} />);
    expect(screen.getByTestId("gallery-section-title")).toHaveTextContent(
      "Gallery",
    );
  });

  it("renders gallery items with images", () => {
    const section = {
      type: "gallery",
      sort_order: 0,
      name_en: "Gallery",
      name_es: "G",
      items: [
        {
          sort_order: 0,
          title_en: "Photo",
          title_es: "F",
          description_en: "",
          description_es: "",
          icon: null,
          image_url: "https://example.com/img.jpg",
        },
      ],
    };
    render(<GallerySection section={section as never} theme={theme} />);
    expect(screen.getByTestId("gallery-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("next-image")).toBeInTheDocument();
  });

  it("renders placeholder number when no image_url", () => {
    const section = {
      type: "gallery",
      sort_order: 0,
      name_en: "Gallery",
      name_es: "G",
      items: [
        {
          sort_order: 0,
          title_en: "",
          title_es: "",
          description_en: "",
          description_es: "",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<GallerySection section={section as never} theme={theme} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("returns null when items are empty", () => {
    const section = {
      type: "gallery",
      sort_order: 0,
      name_en: "Gallery",
      name_es: "G",
      items: [],
    };
    const { container } = render(
      <GallerySection section={section as never} theme={theme} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
