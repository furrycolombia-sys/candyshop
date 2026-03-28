import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { TemplateTable } from "./TemplateTable";

import type { ProductTemplate } from "@/features/templates/domain/types";

const makeTemplate = (
  overrides: Partial<ProductTemplate> = {},
): ProductTemplate => ({
  id: "tpl-1",
  name_en: "Template One",
  name_es: "Plantilla Uno",
  description_en: "Description EN",
  description_es: "Descripcion ES",
  sections: [],
  sort_order: 1,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("TemplateTable", () => {
  const defaultProps = {
    templates: [] as ProductTemplate[],
    isLoading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleActive: vi.fn(),
  };

  it("shows loading state when loading with empty data", () => {
    render(<TemplateTable {...defaultProps} isLoading={true} />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows empty state when no templates", () => {
    render(<TemplateTable {...defaultProps} />);
    expect(screen.getByTestId("templates-empty")).toBeInTheDocument();
    expect(screen.getByText("noTemplates")).toBeInTheDocument();
  });

  it("renders table with templates", () => {
    const templates = [makeTemplate()];
    render(<TemplateTable {...defaultProps} templates={templates} />);
    expect(screen.getByTestId("templates-table")).toBeInTheDocument();
    expect(screen.getByTestId("template-row-tpl-1")).toBeInTheDocument();
  });

  it("renders EN name for en locale", () => {
    const templates = [makeTemplate()];
    render(<TemplateTable {...defaultProps} templates={templates} />);
    expect(screen.getByText("Template One")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    const templates = [makeTemplate()];
    render(
      <TemplateTable {...defaultProps} templates={templates} onEdit={onEdit} />,
    );

    fireEvent.click(screen.getByTestId("template-edit-tpl-1"));
    expect(onEdit).toHaveBeenCalledWith(templates[0]);
  });

  it("calls onDelete when delete button is clicked and confirmed", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    const templates = [makeTemplate()];
    render(
      <TemplateTable
        {...defaultProps}
        templates={templates}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId("template-delete-tpl-1"));
    expect(onDelete).toHaveBeenCalledWith("tpl-1");
  });

  it("does not call onDelete when confirm is cancelled", () => {
    const onDelete = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);

    const templates = [makeTemplate()];
    render(
      <TemplateTable
        {...defaultProps}
        templates={templates}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByTestId("template-delete-tpl-1"));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("renders column headers", () => {
    render(<TemplateTable {...defaultProps} templates={[makeTemplate()]} />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    expect(screen.getByText("sections")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows dash for null description", () => {
    const templates = [makeTemplate({ description_en: null })];
    render(<TemplateTable {...defaultProps} templates={templates} />);
    expect(screen.getByText("\u2014")).toBeInTheDocument();
  });

  it("calls onToggleActive when switch is toggled", () => {
    const onToggleActive = vi.fn();
    render(
      <TemplateTable
        {...defaultProps}
        templates={[makeTemplate()]}
        onToggleActive={onToggleActive}
      />,
    );
    const toggle = screen.getByTestId("template-active-tpl-1");
    fireEvent.click(toggle);
    expect(onToggleActive).toHaveBeenCalled();
  });
});
