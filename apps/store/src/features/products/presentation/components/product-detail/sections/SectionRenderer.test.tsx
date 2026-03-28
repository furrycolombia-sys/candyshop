import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SectionRenderer } from "./SectionRenderer";

vi.mock(
  "@/features/products/presentation/components/product-detail/sections/CardsSection",
  () => ({
    CardsSection: () => <div data-testid="cards-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/product-detail/sections/AccordionSection",
  () => ({
    AccordionSection: () => <div data-testid="accordion-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/product-detail/sections/TwoColumnSection",
  () => ({
    TwoColumnSection: () => <div data-testid="two-column-section" />,
  }),
);

vi.mock(
  "@/features/products/presentation/components/product-detail/sections/GallerySection",
  () => ({
    GallerySection: () => <div data-testid="gallery-section" />,
  }),
);

const theme = {
  bg: "bg-mint",
  bgLight: "bg-mint/15",
  border: "border-mint",
  text: "text-mint",
  badgeBg: "bg-mint",
  rowEven: "bg-mint/5",
  rowOdd: "bg-mint/15",
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
