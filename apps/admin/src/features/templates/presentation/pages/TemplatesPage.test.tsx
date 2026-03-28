import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

const mockInsert = { mutate: vi.fn(), isPending: false };
const mockUpdate = { mutate: vi.fn(), isPending: false };
const mockDelete = { mutate: vi.fn() };
const mockToggle = { mutate: vi.fn() };

vi.mock("@/features/templates/application/hooks/useTemplateMutations", () => ({
  useInsertTemplate: () => mockInsert,
  useUpdateTemplate: () => mockUpdate,
  useDeleteTemplate: () => mockDelete,
  useToggleTemplateActive: () => mockToggle,
}));

vi.mock("@/features/templates/application/hooks/useTemplates", () => ({
  useTemplates: () => ({
    data: [
      {
        id: "t1",
        name_en: "Template",
        name_es: "Plantilla",
        description_en: null,
        description_es: null,
        sections: [],
        sort_order: 1,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/features/templates/presentation/components/TemplateEditor", () => ({
  TemplateEditor: ({
    onCancel,
    onSave,
  }: {
    onCancel: () => void;
    onSave: (v: unknown) => void;
  }) => (
    <div data-testid="template-editor-mock">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" onClick={() => onSave({ name_en: "New" })}>
        Save
      </button>
    </div>
  ),
}));

vi.mock("@/features/templates/presentation/components/TemplateTable", () => ({
  TemplateTable: ({
    onEdit,
    onDelete,
    onToggleActive,
  }: {
    onEdit: (t: unknown) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, active: boolean) => void;
  }) => (
    <div data-testid="template-table-mock">
      <button
        type="button"
        onClick={() =>
          onEdit({
            id: "t1",
            name_en: "Tpl",
            name_es: "Tpl",
            sections: [],
            sort_order: 1,
            is_active: true,
          })
        }
      >
        Edit
      </button>
      <button type="button" onClick={() => onDelete("t1")}>
        Delete
      </button>
      <button type="button" onClick={() => onToggleActive("t1", false)}>
        Toggle
      </button>
    </div>
  ),
}));

import { TemplatesPage } from "./TemplatesPage";

describe("TemplatesPage", () => {
  it("renders the page with title", () => {
    render(<TemplatesPage />);
    expect(screen.getByTestId("templates-title")).toHaveTextContent("title");
  });

  it("shows the table when editor is closed", () => {
    render(<TemplatesPage />);
    expect(screen.getByTestId("template-table-mock")).toBeInTheDocument();
    expect(
      screen.queryByTestId("template-editor-mock"),
    ).not.toBeInTheDocument();
  });

  it("shows the add button when editor is closed", () => {
    render(<TemplatesPage />);
    expect(screen.getByTestId("templates-add")).toBeInTheDocument();
  });

  it("opens editor in create mode when add button is clicked", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByTestId("templates-add"));
    expect(screen.getByTestId("template-editor-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("template-table-mock")).not.toBeInTheDocument();
  });

  it("opens editor in edit mode when edit is triggered", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("template-editor-mock")).toBeInTheDocument();
  });

  it("closes editor when cancel is clicked", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByTestId("templates-add"));
    expect(screen.getByTestId("template-editor-mock")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByTestId("template-table-mock")).toBeInTheDocument();
  });

  it("handleSave calls insertMutation in create mode", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByTestId("templates-add"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockInsert.mutate).toHaveBeenCalled();
  });

  it("handleSave calls updateMutation in edit mode", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));
    expect(mockUpdate.mutate).toHaveBeenCalled();
  });

  it("onDelete calls deleteMutation", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByText("Delete"));
    expect(mockDelete.mutate).toHaveBeenCalledWith("t1");
  });

  it("onToggleActive calls toggleMutation", () => {
    render(<TemplatesPage />);
    fireEvent.click(screen.getByText("Toggle"));
    expect(mockToggle.mutate).toHaveBeenCalledWith({
      id: "t1",
      isActive: false,
    });
  });
});
