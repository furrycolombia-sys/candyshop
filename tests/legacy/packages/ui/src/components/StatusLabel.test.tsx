import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { StatusLabel } from "./StatusLabel";

describe("StatusLabel", () => {
  it("renders children", () => {
    render(<StatusLabel>Healthy</StatusLabel>);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<StatusLabel>Status</StatusLabel>);
    expect(screen.getByText("Status").tagName).toBe("SPAN");
  });

  it("applies healthy variant by default", () => {
    render(<StatusLabel>OK</StatusLabel>);
    expect(screen.getByText("OK").className).toContain("bg-success");
  });

  it("applies attention variant", () => {
    render(<StatusLabel variant="attention">Warn</StatusLabel>);
    expect(screen.getByText("Warn").className).toContain("bg-warning");
  });

  it("applies critical variant", () => {
    render(<StatusLabel variant="critical">Fail</StatusLabel>);
    expect(screen.getByText("Fail").className).toContain("bg-destructive");
  });

  it("applies info variant", () => {
    render(<StatusLabel variant="info">Note</StatusLabel>);
    expect(screen.getByText("Note").className).toContain("bg-info");
  });

  it("applies brand variant", () => {
    render(<StatusLabel variant="brand">Brand</StatusLabel>);
    expect(screen.getByText("Brand").className).toContain("bg-brand");
  });

  it("shows icon by default", () => {
    const { container } = render(<StatusLabel>With Icon</StatusLabel>);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("hides icon when showIcon is false", () => {
    const { container } = render(
      <StatusLabel showIcon={false}>No Icon</StatusLabel>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("shows icon wrapper for healthy variant", () => {
    const { container } = render(
      <StatusLabel variant="healthy">OK</StatusLabel>,
    );
    // healthy variant has showWrapper: true, so there's a wrapping span around the icon
    const wrapper = container.querySelector("span.rounded-full.border");
    expect(wrapper).toBeInTheDocument();
  });

  it("does not show icon wrapper for attention variant", () => {
    const { container } = render(
      <StatusLabel variant="attention">Warn</StatusLabel>,
    );
    // attention variant has showWrapper: false, no wrapping span
    const wrapper = container.querySelector("span.rounded-full.border");
    expect(wrapper).toBeNull();
  });

  it("applies custom className", () => {
    render(<StatusLabel className="my-class">Test</StatusLabel>);
    expect(screen.getByText("Test").className).toContain("my-class");
  });
});
