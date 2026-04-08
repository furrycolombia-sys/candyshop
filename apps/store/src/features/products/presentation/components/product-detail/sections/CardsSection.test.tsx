import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { CardsSection } from "./CardsSection";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock(
  "@/features/products/presentation/components/product-detail/lucideIconMap",
  () => ({
    DEFAULT_ICON_NAME: "Sparkles",
    getIcon: () => {
      return () => <svg data-testid="mock-icon" />;
    },
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

describe("CardsSection", () => {
  it("renders section title", () => {
    const section = {
      type: "cards",
      sort_order: 0,
      name_en: "Features",
      name_es: "Caracter\u00EDsticas",
      items: [
        {
          sort_order: 0,
          title_en: "Card1",
          title_es: "C1",
          description_en: "Desc1",
          description_es: "D1",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<CardsSection section={section as never} theme={theme} />);
    expect(screen.getByTestId("cards-section-title")).toHaveTextContent(
      "Features",
    );
  });

  it("renders card items", () => {
    const section = {
      type: "cards",
      sort_order: 0,
      name_en: "Features",
      name_es: "F",
      items: [
        {
          sort_order: 1,
          title_en: "Card A",
          title_es: "CA",
          description_en: "Desc A",
          description_es: "DA",
          icon: null,
          image_url: null,
        },
        {
          sort_order: 0,
          title_en: "Card B",
          title_es: "CB",
          description_en: "Desc B",
          description_es: "DB",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<CardsSection section={section as never} theme={theme} />);
    expect(screen.getByTestId("card-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("card-item-1")).toBeInTheDocument();
  });

  it("returns null when items are empty", () => {
    const section = {
      type: "cards",
      sort_order: 0,
      name_en: "Features",
      name_es: "F",
      items: [],
    };
    const { container } = render(
      <CardsSection section={section as never} theme={theme} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("does not render title when name is empty", () => {
    const section = {
      type: "cards",
      sort_order: 0,
      name_en: "",
      name_es: "",
      items: [
        {
          sort_order: 0,
          title_en: "Card",
          title_es: "C",
          description_en: "D",
          description_es: "D",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<CardsSection section={section as never} theme={theme} />);
    expect(screen.queryByTestId("cards-section-title")).not.toBeInTheDocument();
  });
});
