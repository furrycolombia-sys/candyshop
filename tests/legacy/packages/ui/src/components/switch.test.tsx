import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("renders without crashing", () => {
    render(<Switch />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeInTheDocument();
  });

  it("has data-slot attribute", () => {
    render(<Switch />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-slot", "switch");
  });

  it("is unchecked by default", () => {
    render(<Switch />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "unchecked");
  });

  it("renders as checked when checked prop is true", () => {
    render(<Switch checked={true} />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toHaveAttribute("data-state", "checked");
  });

  it("calls onCheckedChange when toggled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch onCheckedChange={onCheckedChange} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not call onCheckedChange when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch disabled onCheckedChange={onCheckedChange} />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("renders as disabled when disabled prop is set", () => {
    render(<Switch disabled />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Switch className="custom-class" />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl.className).toContain("custom-class");
  });
});
