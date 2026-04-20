import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/products/application/useAutoResize", () => ({
  useAutoResize: () => vi.fn(),
}));

import { AutoTextarea } from "./AutoTextarea";

describe("AutoTextarea", () => {
  it("renders a textarea with the given value", () => {
    render(<AutoTextarea value="Hello" data-testid="auto-textarea" />);
    const textarea = screen.getByTestId("auto-textarea");
    expect(textarea).toHaveValue("Hello");
  });

  it("calls onChange when text changes", () => {
    const onChange = vi.fn();
    render(<AutoTextarea onChange={onChange} data-testid="auto-textarea" />);
    fireEvent.change(screen.getByTestId("auto-textarea"), {
      target: { value: "new" },
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("renders with single row by default", () => {
    render(<AutoTextarea data-testid="auto-textarea" />);
    expect(screen.getByTestId("auto-textarea")).toHaveAttribute("rows", "1");
  });
});
