import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

import { BuyerField } from "./BuyerField";

const baseProps = {
  fieldKey: "name",
  fieldType: "text" as const,
  value: "",
  onChange: vi.fn(),
  disabled: false,
  sellerId: "seller-1",
};

describe("BuyerField", () => {
  it("renders the input with correct type", () => {
    render(<BuyerField {...baseProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders email input for email type", () => {
    render(<BuyerField {...baseProps} fieldType="email" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.type).toBe("email");
  });

  it("shows test id based on fieldKey and sellerId", () => {
    render(<BuyerField {...baseProps} />);
    expect(screen.getByTestId("buyer-field-name-seller-1")).toBeInTheDocument();
  });

  it("calls onChange when input value changes", () => {
    const onChange = vi.fn();
    render(<BuyerField {...baseProps} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "John" },
    });
    expect(onChange).toHaveBeenCalledWith("John");
  });

  it("is disabled when disabled prop is true", () => {
    render(<BuyerField {...baseProps} disabled={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("renders label text via translation key", () => {
    render(<BuyerField {...baseProps} fieldKey="email" />);
    expect(screen.getByText("buyerFields.email")).toBeInTheDocument();
  });
});
