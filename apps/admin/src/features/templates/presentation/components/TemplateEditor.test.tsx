import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

// Capture the SectionBlock callbacks so tests can invoke them to trigger TemplateEditor handlers
let capturedOnUpdate: (p: Record<string, unknown>) => void = () => {};
let capturedOnRemove: () => void = () => {};
let capturedOnUpdateItem: (
  iIdx: number,
  p: Record<string, unknown>,
) => void = () => {};
let capturedOnAddItem: () => void = () => {};
let capturedOnRemoveItem: (iIdx: number) => void = () => {};

vi.mock("@/features/templates/presentation/components/SectionBlock", () => ({
  SectionBlock: ({
    sectionIndex,
    onUpdate,
    onRemove,
    onUpdateItem,
    onAddItem,
    onRemoveItem,
  }: {
    sectionIndex: number;
    onUpdate: (p: Record<string, unknown>) => void;
    onRemove: () => void;
    onUpdateItem: (iIdx: number, p: Record<string, unknown>) => void;
    onAddItem: () => void;
    onRemoveItem: (iIdx: number) => void;
  }) => {
    capturedOnUpdate = onUpdate;
    capturedOnRemove = onRemove;
    capturedOnUpdateItem = onUpdateItem;
    capturedOnAddItem = onAddItem;
    capturedOnRemoveItem = onRemoveItem;
    return <div data-testid={`section-block-${sectionIndex}`}>Section</div>;
  },
}));

import { TemplateEditor } from "./TemplateEditor";

describe("TemplateEditor", () => {
  const defaultProps = {
    isSaving: false,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders the editor with test id", () => {
    render(<TemplateEditor {...defaultProps} />);
    expect(screen.getByTestId("template-editor")).toBeInTheDocument();
  });

  it("renders name input fields", () => {
    render(<TemplateEditor {...defaultProps} />);
    expect(screen.getByTestId("template-name-en")).toBeInTheDocument();
    expect(screen.getByTestId("template-name-es")).toBeInTheDocument();
  });

  it("renders description input fields", () => {
    render(<TemplateEditor {...defaultProps} />);
    expect(screen.getByTestId("template-desc-en")).toBeInTheDocument();
    expect(screen.getByTestId("template-desc-es")).toBeInTheDocument();
  });

  it("initializes with provided initial values", () => {
    const initial = {
      name_en: "Test Template",
      name_es: "Plantilla Test",
      description_en: "Desc EN",
      description_es: "Desc ES",
      sections: [],
      sort_order: 1,
      is_active: true,
    };

    render(<TemplateEditor {...defaultProps} initial={initial} />);

    expect(screen.getByTestId("template-name-en")).toHaveValue("Test Template");
    expect(screen.getByTestId("template-name-es")).toHaveValue(
      "Plantilla Test",
    );
  });

  it("calls onSave with form values when save button is clicked", () => {
    const onSave = vi.fn();
    render(<TemplateEditor {...defaultProps} onSave={onSave} />);

    // Type into name field
    fireEvent.change(screen.getByTestId("template-name-en"), {
      target: { value: "My Template" },
    });

    fireEvent.click(screen.getByTestId("template-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].name_en).toBe("My Template");
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<TemplateEditor {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId("template-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows saving text when isSaving is true", () => {
    render(<TemplateEditor {...defaultProps} isSaving={true} />);
    expect(screen.getByTestId("template-save")).toHaveTextContent("saving");
  });

  it("shows save text when isSaving is false", () => {
    render(<TemplateEditor {...defaultProps} isSaving={false} />);
    expect(screen.getByTestId("template-save")).toHaveTextContent("save");
  });

  it("disables save button when isSaving", () => {
    render(<TemplateEditor {...defaultProps} isSaving={true} />);
    expect(screen.getByTestId("template-save")).toBeDisabled();
  });

  it("adds a section when add section button is clicked", () => {
    render(<TemplateEditor {...defaultProps} />);

    // Initially no sections
    expect(screen.queryByTestId("section-block-0")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("template-add-section"));

    expect(screen.getByTestId("section-block-0")).toBeInTheDocument();
  });

  it("updateSection updates the section name via onUpdate callback", () => {
    const onSave = vi.fn();
    render(<TemplateEditor {...defaultProps} onSave={onSave} />);

    fireEvent.click(screen.getByTestId("template-add-section"));

    act(() => {
      capturedOnUpdate({ name_en: "Updated Section" });
    });

    fireEvent.click(screen.getByTestId("template-save"));
    const saved = onSave.mock.calls[0][0] as {
      sections: Array<{ name_en: string }>;
    };
    expect(saved.sections[0].name_en).toBe("Updated Section");
  });

  it("removeSection removes the section via onRemove callback", () => {
    render(<TemplateEditor {...defaultProps} />);

    fireEvent.click(screen.getByTestId("template-add-section"));
    expect(screen.getByTestId("section-block-0")).toBeInTheDocument();

    act(() => {
      capturedOnRemove();
    });

    expect(screen.queryByTestId("section-block-0")).not.toBeInTheDocument();
  });

  it("addItem adds an item to the section via onAddItem callback", () => {
    const onSave = vi.fn();
    render(<TemplateEditor {...defaultProps} onSave={onSave} />);

    fireEvent.click(screen.getByTestId("template-add-section"));

    act(() => {
      capturedOnAddItem();
    });

    fireEvent.click(screen.getByTestId("template-save"));
    const saved = onSave.mock.calls[0][0] as {
      sections: Array<{ items: Array<{ title_en: string }> }>;
    };
    expect(saved.sections[0].items).toHaveLength(1);
  });

  it("updateItem updates an item in the section via onUpdateItem callback", () => {
    const onSave = vi.fn();
    render(<TemplateEditor {...defaultProps} onSave={onSave} />);

    fireEvent.click(screen.getByTestId("template-add-section"));
    act(() => {
      capturedOnAddItem();
    });
    act(() => {
      capturedOnUpdateItem(0, { title_en: "My Item" });
    });

    fireEvent.click(screen.getByTestId("template-save"));
    const saved = onSave.mock.calls[0][0] as {
      sections: Array<{ items: Array<{ title_en: string }> }>;
    };
    expect(saved.sections[0].items[0].title_en).toBe("My Item");
  });

  it("removeItem removes an item from the section via onRemoveItem callback", () => {
    const onSave = vi.fn();
    render(<TemplateEditor {...defaultProps} onSave={onSave} />);

    fireEvent.click(screen.getByTestId("template-add-section"));
    act(() => {
      capturedOnAddItem();
    });
    act(() => {
      capturedOnRemoveItem(0);
    });

    fireEvent.click(screen.getByTestId("template-save"));
    const saved = onSave.mock.calls[0][0] as {
      sections: Array<{ items: unknown[] }>;
    };
    expect(saved.sections[0].items).toHaveLength(0);
  });
});
