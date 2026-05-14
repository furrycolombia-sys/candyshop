import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("shared", () => ({
  i18nField: () => "",
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { DynamicFormField } from "./DynamicFormField";

const baseField = {
  id: "field-1",
  type: "text" as const,
  label_en: "Full Name",
  required: false,
};

describe("DynamicFormField", () => {
  it("renders label from label_en", () => {
    render(<DynamicFormField field={baseField} value="" onChange={vi.fn()} />);
    expect(screen.getByText("Full Name")).toBeInTheDocument();
  });

  it("renders input for non-textarea type", () => {
    render(
      <DynamicFormField field={baseField} value="test" onChange={vi.fn()} />,
    );
    const input = screen.getByRole("textbox");
    expect(input.tagName.toLowerCase()).toBe("input");
  });

  it("renders textarea for textarea type", () => {
    const field = { ...baseField, type: "textarea" as const };
    render(<DynamicFormField field={field} value="test" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input.tagName.toLowerCase()).toBe("textarea");
  });

  it("shows required marker when required is true", () => {
    render(
      <DynamicFormField
        field={{ ...baseField, required: true }}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("does not show required marker when required is false", () => {
    render(<DynamicFormField field={baseField} value="" onChange={vi.fn()} />);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("shows error message when error prop is provided", () => {
    render(
      <DynamicFormField
        field={baseField}
        value=""
        onChange={vi.fn()}
        error="This field is required"
      />,
    );
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("does not show error when error is null", () => {
    render(
      <DynamicFormField
        field={baseField}
        value=""
        onChange={vi.fn()}
        error={null}
      />,
    );
    expect(
      screen.queryByTestId("dynamic-field-field-1-error"),
    ).not.toBeInTheDocument();
  });

  it("calls onChange when input value changes", () => {
    const onChange = vi.fn();
    render(<DynamicFormField field={baseField} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("calls onChange when textarea value changes", () => {
    const onChange = vi.fn();
    const field = { ...baseField, type: "textarea" as const };
    render(<DynamicFormField field={field} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "long text" },
    });
    expect(onChange).toHaveBeenCalledWith("long text");
  });
});
