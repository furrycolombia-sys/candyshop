import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Label } from "./label";

describe("Label", () => {
  it("renders children", () => {
    render(<Label>Healthy</Label>);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<Label>Status</Label>);
    expect(screen.getByText("Status").tagName).toBe("SPAN");
  });

  it("applies healthy variant by default", () => {
    render(<Label>OK</Label>);
    expect(screen.getByText("OK").className).toContain("bg-success");
  });

  it("applies attention variant", () => {
    render(<Label variant="attention">Warn</Label>);
    expect(screen.getByText("Warn").className).toContain("bg-warning");
  });

  it("applies critical variant", () => {
    render(<Label variant="critical">Fail</Label>);
    expect(screen.getByText("Fail").className).toContain("bg-destructive");
  });

  it("applies info variant", () => {
    render(<Label variant="info">Note</Label>);
    expect(screen.getByText("Note").className).toContain("bg-info");
  });

  it("applies brand variant", () => {
    render(<Label variant="brand">Brand</Label>);
    expect(screen.getByText("Brand").className).toContain("bg-brand");
  });

  it("shows icon by default", () => {
    const { container } = render(<Label>With Icon</Label>);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("hides icon when showIcon is false", () => {
    const { container } = render(<Label showIcon={false}>No Icon</Label>);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("shows icon wrapper for healthy variant", () => {
    const { container } = render(<Label variant="healthy">OK</Label>);
    // healthy variant has showWrapper: true, so there's a wrapping span around the icon
    const wrapper = container.querySelector("span.rounded-full.border");
    expect(wrapper).toBeInTheDocument();
  });

  it("does not show icon wrapper for attention variant", () => {
    const { container } = render(<Label variant="attention">Warn</Label>);
    // attention variant has showWrapper: false, no wrapping span
    const wrapper = container.querySelector("span.rounded-full.border");
    expect(wrapper).toBeNull();
  });

  it("applies custom className", () => {
    render(<Label className="my-class">Test</Label>);
    expect(screen.getByText("Test").className).toContain("my-class");
  });
});
