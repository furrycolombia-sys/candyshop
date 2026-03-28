import { render, screen, fireEvent } from "@testing-library/react";
// eslint-disable-next-line import/order -- vi.mock calls between imports require this ordering
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("./ItemRow", () => ({
  ItemRow: ({
    onRemove,
    onUpdate,
  }: {
    onRemove: () => void;
    onUpdate: (p: Record<string, unknown>) => void;
  }) => (
    <div data-testid="item-row">
      <button type="button" onClick={onRemove}>
        Remove
      </button>
      <button type="button" onClick={() => onUpdate({ title_en: "x" })}>
        Update
      </button>
    </div>
  ),
}));

// eslint-disable-next-line import/order -- vi.mock must be hoisted before this import
import type { ProductSection } from "shared/types";

import { SectionBlock } from "./SectionBlock";

const defaultSection: ProductSection = {
  name_en: "Section EN",
  name_es: "Section ES",
  type: "cards",
  sort_order: 1,
  items: [
    {
      title_en: "Item",
      title_es: "Item",
      description_en: "",
      description_es: "",
      sort_order: 1,
    },
  ],
};

describe("SectionBlock", () => {
  const defaultProps = {
    section: defaultSection,
    sectionIndex: 0,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onUpdateItem: vi.fn(),
    onAddItem: vi.fn(),
    onRemoveItem: vi.fn(),
  };

  it("renders the section with test id", () => {
    render(<SectionBlock {...defaultProps} />);
    expect(screen.getByTestId("template-section-0")).toBeInTheDocument();
  });

  it("renders section name inputs", () => {
    render(<SectionBlock {...defaultProps} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onUpdate when name_en changes", () => {
    const onUpdate = vi.fn();
    render(<SectionBlock {...defaultProps} onUpdate={onUpdate} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "New Name" } });
    expect(onUpdate).toHaveBeenCalledWith({ name_en: "New Name" });
  });

  it("renders type selector with section types", () => {
    render(<SectionBlock {...defaultProps} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("cards");

    // eslint-disable-next-line testing-library/no-node-access -- querySelectorAll needed to count <option> elements inside <select>
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(4); // cards, accordion, two-column, gallery
  });

  it("calls onUpdate when type changes", () => {
    const onUpdate = vi.fn();
    render(<SectionBlock {...defaultProps} onUpdate={onUpdate} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "accordion" },
    });
    expect(onUpdate).toHaveBeenCalledWith({ type: "accordion" });
  });

  it("renders item rows", () => {
    render(<SectionBlock {...defaultProps} />);
    expect(screen.getByTestId("item-row")).toBeInTheDocument();
  });

  it("calls onAddItem when add button is clicked", () => {
    const onAddItem = vi.fn();
    render(<SectionBlock {...defaultProps} onAddItem={onAddItem} />);

    fireEvent.click(screen.getByTestId("template-add-item-0"));
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when remove section button is clicked", () => {
    const onRemove = vi.fn();
    render(<SectionBlock {...defaultProps} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "removeSection" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
