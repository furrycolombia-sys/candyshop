import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("renders the count", () => {
    render(<Chip count={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("returns null when count is 0 and hideZero is true (default)", () => {
    const { container } = render(<Chip count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when count is 0 and hideZero is false", () => {
    render(<Chip count={0} hideZero={false} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows 99+ when count exceeds default max", () => {
    render(<Chip count={150} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows custom max+ when count exceeds custom max", () => {
    render(<Chip count={15} max={10} />);
    expect(screen.getByText("10+")).toBeInTheDocument();
  });

  it("shows exact count when equal to max", () => {
    render(<Chip count={99} />);
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<Chip count={3} />);
    expect(screen.getByText("3").tagName).toBe("SPAN");
  });

  it("applies default variant classes", () => {
    render(<Chip count={1} />);
    expect(screen.getByText("1").className).toContain("bg-destructive");
  });

  it("applies brand variant classes", () => {
    render(<Chip count={1} variant="brand" />);
    expect(screen.getByText("1").className).toContain("bg-brand");
  });

  it("applies secondary variant classes", () => {
    render(<Chip count={1} variant="secondary" />);
    expect(screen.getByText("1").className).toContain("bg-secondary");
  });

  it("applies sm size classes", () => {
    render(<Chip count={1} size="sm" />);
    expect(screen.getByText("1").className).toContain("size-4");
  });

  it("applies lg size classes", () => {
    render(<Chip count={1} size="lg" />);
    expect(screen.getByText("1").className).toContain("size-6");
  });

  it("applies custom className", () => {
    render(<Chip count={1} className="my-custom" />);
    expect(screen.getByText("1").className).toContain("my-custom");
  });
});
