import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, it, expect } from "vitest";

import { Input } from "./input";

describe("Input", () => {
  it("renders without crashing", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("has data-slot attribute", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("data-slot", "input");
  });

  it("renders with placeholder", () => {
    render(<Input placeholder="Enter email" />);
    const input = screen.getByPlaceholderText("Enter email");
    expect(input).toBeInTheDocument();
  });

  it("renders with the correct type", () => {
    render(<Input type="email" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  it("renders as disabled when disabled prop is set", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("passes through additional HTML attributes", () => {
    render(<Input aria-label="test input" data-custom="value" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-label", "test input");
    expect(input).toHaveAttribute("data-custom", "value");
  });
});
