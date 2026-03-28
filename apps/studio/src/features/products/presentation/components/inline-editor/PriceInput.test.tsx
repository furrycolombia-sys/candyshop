import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { PriceInput } from "./PriceInput";

describe("PriceInput", () => {
  const defaultProps = {
    inputRef: vi.fn(),
    value: "50000",
    onChange: vi.fn(),
    onBlur: vi.fn(),
    placeholder: "0",
    className: "",
    testId: "price-input",
  };

  it("renders with the given value", () => {
    render(<PriceInput {...defaultProps} />);
    expect(screen.getByTestId("price-input")).toHaveValue("50000");
  });

  it("strips non-digit characters on change", () => {
    const onChange = vi.fn();
    render(<PriceInput {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByTestId("price-input"), {
      target: { value: "50,000abc" },
    });
    expect(onChange).toHaveBeenCalledWith("50000");
  });

  it("calls onBlur when input loses focus", () => {
    const onBlur = vi.fn();
    render(<PriceInput {...defaultProps} onBlur={onBlur} />);
    fireEvent.blur(screen.getByTestId("price-input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("renders empty string when value is null", () => {
    render(<PriceInput {...defaultProps} value={null} />);
    expect(screen.getByTestId("price-input")).toHaveValue("");
  });

  it("has numeric inputMode", () => {
    render(<PriceInput {...defaultProps} />);
    expect(screen.getByTestId("price-input")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
  });
});
