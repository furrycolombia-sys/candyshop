import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders with progressbar role", () => {
    render(<ProgressBar value={50} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets aria-valuenow to the value", () => {
    render(<ProgressBar value={75} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "75",
    );
  });

  it("sets aria-valuemin and aria-valuemax", () => {
    render(<ProgressBar value={50} aria-label="Upload progress" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("clamps value to 0 minimum", () => {
    render(<ProgressBar value={-10} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("clamps value to 100 maximum", () => {
    render(<ProgressBar value={150} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("renders the inner track with correct width", () => {
    const { container } = render(
      <ProgressBar value={60} aria-label="Upload progress" />,
    );
    const track = container.querySelector("[role='progressbar'] > div");
    expect(track).toHaveStyle({ width: "60%" });
  });

  it("applies default variant class", () => {
    const { container } = render(
      <ProgressBar value={50} aria-label="Upload progress" />,
    );
    const track = container.querySelector("[role='progressbar'] > div");
    expect(track?.className).toContain("bg-muted-foreground");
  });

  it("applies success variant class", () => {
    const { container } = render(
      <ProgressBar value={50} variant="success" aria-label="Upload progress" />,
    );
    const track = container.querySelector("[role='progressbar'] > div");
    expect(track?.className).toContain("bg-success");
  });

  it("applies error variant class", () => {
    const { container } = render(
      <ProgressBar value={50} variant="error" aria-label="Upload progress" />,
    );
    const track = container.querySelector("[role='progressbar'] > div");
    expect(track?.className).toContain("bg-destructive");
  });

  it("applies sm size", () => {
    render(<ProgressBar value={50} size="sm" aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar").className).toContain("h-2");
  });

  it("applies md size", () => {
    render(<ProgressBar value={50} size="md" aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar").className).toContain("h-4");
  });

  it("applies lg size by default", () => {
    render(<ProgressBar value={50} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar").className).toContain("h-8");
  });

  it("applies custom className", () => {
    render(
      <ProgressBar
        value={50}
        className="custom"
        aria-label="Upload progress"
      />,
    );
    expect(screen.getByRole("progressbar").className).toContain("custom");
  });
});
