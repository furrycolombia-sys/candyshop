import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockTemplates = [
  {
    id: "tmpl-1",
    name_en: "Basic Template",
    name_es: "Plantilla Basica",
    description_en: "A basic template",
    description_es: null,
    sections: [
      {
        name_en: "Section 1",
        name_es: "",
        type: "cards",
        sort_order: 0,
        items: [],
      },
    ],
  },
];

vi.mock("@/features/products/application/hooks/useProductTemplates", () => ({
  useProductTemplates: () => ({
    data: mockTemplates,
    isLoading: false,
  }),
}));

import { TemplatePicker } from "./TemplatePicker";

describe("TemplatePicker", () => {
  it("renders the trigger button", () => {
    render(<TemplatePicker onApply={vi.fn()} hasSections={false} />);
    expect(screen.getByTestId("toolbar-use-template")).toBeInTheDocument();
  });

  it("renders template names", () => {
    render(<TemplatePicker onApply={vi.fn()} hasSections={false} />);
    expect(screen.getByText("Basic Template")).toBeInTheDocument();
  });

  it("renders template description", () => {
    render(<TemplatePicker onApply={vi.fn()} hasSections={false} />);
    expect(screen.getByText("A basic template")).toBeInTheDocument();
  });

  it("shows section count", () => {
    render(<TemplatePicker onApply={vi.fn()} hasSections={false} />);
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });
});

describe("TemplatePicker empty state", () => {
  it("renders without crashing when templates is empty", () => {
    render(<TemplatePicker onApply={vi.fn()} hasSections={false} />);
    expect(screen.getByTestId("toolbar-use-template")).toBeInTheDocument();
  });
});
