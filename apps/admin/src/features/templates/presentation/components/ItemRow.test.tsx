import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { ItemRow } from "./ItemRow";

describe("ItemRow", () => {
  const defaultItem = {
    title_en: "Title EN",
    title_es: "Title ES",
    description_en: "Desc EN",
    description_es: "Desc ES",
    icon: "Star",
    sort_order: 1,
  };

  const defaultProps = {
    item: defaultItem,
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
  };

  it("renders input fields with item values", () => {
    render(<ItemRow {...defaultProps} />);

    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(5);
  });

  it("calls onUpdate when title_en changes", () => {
    const onUpdate = vi.fn();
    render(<ItemRow {...defaultProps} onUpdate={onUpdate} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "New Title" } });
    expect(onUpdate).toHaveBeenCalledWith({ title_en: "New Title" });
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<ItemRow {...defaultProps} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "removeItem" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("calls onUpdate when title_es changes", () => {
    const onUpdate = vi.fn();
    render(<ItemRow {...defaultProps} onUpdate={onUpdate} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "Nuevo" } });
    expect(onUpdate).toHaveBeenCalledWith({ title_es: "Nuevo" });
  });

  it("calls onUpdate when description_en changes", () => {
    const onUpdate = vi.fn();
    render(<ItemRow {...defaultProps} onUpdate={onUpdate} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[2], { target: { value: "New Desc" } });
    expect(onUpdate).toHaveBeenCalledWith({ description_en: "New Desc" });
  });

  it("renders empty string for icon when null", () => {
    const item = { ...defaultItem, icon: undefined };
    render(<ItemRow {...defaultProps} item={item} />);

    const inputs = screen.getAllByRole("textbox");
    // The icon input should be empty
    const iconInput = inputs[4];
    expect(iconInput).toHaveValue("");
  });
});
