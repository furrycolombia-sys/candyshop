import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AccordionSection } from "./AccordionSection";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
}));

vi.mock(
  "@/features/products/presentation/components/product-detail/sections/AccordionItem",
  () => ({
    AccordionItem: ({
      question,
      index,
    }: {
      question: string;
      index: number;
    }) => <div data-testid={`accordion-item-mock-${index}`}>{question}</div>,
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

describe("AccordionSection", () => {
  it("renders section title", () => {
    const section = {
      type: "accordion",
      sort_order: 0,
      name_en: "FAQ",
      name_es: "Preguntas",
      items: [
        {
          sort_order: 0,
          title_en: "Q1",
          title_es: "P1",
          description_en: "A1",
          description_es: "R1",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<AccordionSection section={section as never} theme={theme} />);
    expect(screen.getByTestId("accordion-section-title")).toHaveTextContent(
      "FAQ",
    );
  });

  it("renders accordion items", () => {
    const section = {
      type: "accordion",
      sort_order: 0,
      name_en: "FAQ",
      name_es: "FAQ",
      items: [
        {
          sort_order: 1,
          title_en: "Question 1",
          title_es: "P1",
          description_en: "A1",
          description_es: "R1",
          icon: null,
          image_url: null,
        },
        {
          sort_order: 0,
          title_en: "Question 2",
          title_es: "P2",
          description_en: "A2",
          description_es: "R2",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<AccordionSection section={section as never} theme={theme} />);
    expect(screen.getByTestId("accordion-item-mock-0")).toBeInTheDocument();
    expect(screen.getByTestId("accordion-item-mock-1")).toBeInTheDocument();
  });

  it("returns null when items are empty", () => {
    const section = {
      type: "accordion",
      sort_order: 0,
      name_en: "FAQ",
      name_es: "FAQ",
      items: [],
    };
    const { container } = render(
      <AccordionSection section={section as never} theme={theme} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
