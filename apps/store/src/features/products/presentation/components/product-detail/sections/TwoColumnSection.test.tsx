import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TwoColumnSection } from "./TwoColumnSection";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
  i18nField: (obj: Record<string, unknown>, field: string, locale: string) =>
    obj[`${field}_${locale}`] ?? obj[`${field}_en`] ?? "",
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

describe("TwoColumnSection", () => {
  it("renders section title", () => {
    const section = {
      type: "two-column",
      sort_order: 0,
      name_en: "Specs",
      name_es: "Especificaciones",
      items: [
        {
          sort_order: 0,
          title_en: "Material",
          title_es: "Material",
          description_en: "Cotton",
          description_es: "Algodón",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<TwoColumnSection section={section as never} theme={theme} />);
    expect(screen.getByTestId("two-column-section-title")).toHaveTextContent(
      "Specs",
    );
  });

  it("renders rows with label and value", () => {
    const section = {
      type: "two-column",
      sort_order: 0,
      name_en: "Specs",
      name_es: "S",
      items: [
        {
          sort_order: 0,
          title_en: "Material",
          title_es: "M",
          description_en: "Cotton",
          description_es: "A",
          icon: null,
          image_url: null,
        },
        {
          sort_order: 1,
          title_en: "Size",
          title_es: "T",
          description_en: "Large",
          description_es: "G",
          icon: null,
          image_url: null,
        },
      ],
    };
    render(<TwoColumnSection section={section as never} theme={theme} />);
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByText("Cotton")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("returns null when items are empty", () => {
    const section = {
      type: "two-column",
      sort_order: 0,
      name_en: "Specs",
      name_es: "S",
      items: [],
    };
    const { container } = render(
      <TwoColumnSection section={section as never} theme={theme} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
