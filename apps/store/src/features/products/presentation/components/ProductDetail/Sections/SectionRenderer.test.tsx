import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SectionRenderer } from "./SectionRenderer";

vi.mock(
  "@/features/products/presentation/components/ProductDetail/Sections/CardsSection",
  () => ({
    CardsSection: () => <div data-testid="cards-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/ProductDetail/Sections/AccordionSection",
  () => ({
    AccordionSection: () => <div data-testid="accordion-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/ProductDetail/Sections/TwoColumnSection",
  () => ({
    TwoColumnSection: () => <div data-testid="two-column-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/ProductDetail/Sections/GallerySection",
  () => ({
    GallerySection: () => <div data-testid="gallery-section" />,
  }),
);

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

const baseSection = {
  sort_order: 0,
  items: [],
  name_en: "Test",
  name_es: "Test",
};

describe("SectionRenderer", () => {
  it("renders CardsSection for cards type", () => {
    render(
      <SectionRenderer
        section={{ ...baseSection, type: "cards" } as never}
        theme={theme}
      />,
    );
    expect(screen.getByTestId("cards-section")).toBeInTheDocument();
  });

  it("renders AccordionSection for accordion type", () => {
    render(
      <SectionRenderer
        section={{ ...baseSection, type: "accordion" } as never}
        theme={theme}
      />,
    );
    expect(screen.getByTestId("accordion-section")).toBeInTheDocument();
  });

  it("renders TwoColumnSection for two-column type", () => {
    render(
      <SectionRenderer
        section={{ ...baseSection, type: "two-column" } as never}
        theme={theme}
      />,
    );
    expect(screen.getByTestId("two-column-section")).toBeInTheDocument();
  });

  it("renders GallerySection for gallery type", () => {
    render(
      <SectionRenderer
        section={{ ...baseSection, type: "gallery" } as never}
        theme={theme}
      />,
    );
    expect(screen.getByTestId("gallery-section")).toBeInTheDocument();
  });

  it("renders null for unknown type", () => {
    const { container } = render(
      <SectionRenderer
        section={{ ...baseSection, type: "unknown" } as never}
        theme={theme}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
