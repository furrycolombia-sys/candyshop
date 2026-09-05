import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { ErrorIndicator } from "./ErrorIndicator";

describe("ErrorIndicator", () => {
  it("returns null when error is null", () => {
    const { container } = render(<ErrorIndicator error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when error is provided", () => {
    render(<ErrorIndicator error="Something failed" />);
    const button = screen.getByTestId("error-indicator");
    expect(button).toBeInTheDocument();
  });

  it("sets aria-label to the error message", () => {
    render(<ErrorIndicator error="Connection lost" />);
    const button = screen.getByTestId("error-indicator");
    expect(button).toHaveAttribute("aria-label", "Connection lost");
  });

  it("sets title to the error message", () => {
    render(<ErrorIndicator error="Connection lost" />);
    const button = screen.getByTestId("error-indicator");
    expect(button).toHaveAttribute("title", "Connection lost");
  });

  it("calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorIndicator error="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId("error-indicator"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders without onRetry callback", () => {
    render(<ErrorIndicator error="Error" />);
    const button = screen.getByTestId("error-indicator");
    expect(button).toBeInTheDocument();
  });
});
