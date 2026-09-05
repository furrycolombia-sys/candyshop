import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { InfoBadge } from "./InfoBadge";

describe("InfoBadge", () => {
  it("renders children", () => {
    render(<InfoBadge>Active</InfoBadge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders as a span element", () => {
    render(<InfoBadge>Label</InfoBadge>);
    expect(screen.getByText("Label").tagName).toBe("SPAN");
  });

  it("applies default variant classes", () => {
    render(<InfoBadge>Default</InfoBadge>);
    const el = screen.getByText("Default");
    expect(el.className).toContain("bg-muted/50");
  });

  it("applies success variant classes", () => {
    render(<InfoBadge variant="success">OK</InfoBadge>);
    expect(screen.getByText("OK").className).toContain("bg-success/20");
  });

  it("applies warning variant classes", () => {
    render(<InfoBadge variant="warning">Warn</InfoBadge>);
    expect(screen.getByText("Warn").className).toContain("bg-warning/20");
  });

  it("applies destructive variant classes", () => {
    render(<InfoBadge variant="destructive">Error</InfoBadge>);
    expect(screen.getByText("Error").className).toContain("bg-destructive/20");
  });

  it("applies info variant classes", () => {
    render(<InfoBadge variant="info">Info</InfoBadge>);
    expect(screen.getByText("Info").className).toContain("bg-info/20");
  });

  it("applies sm size classes (default)", () => {
    render(<InfoBadge>Small</InfoBadge>);
    expect(screen.getByText("Small").className).toContain("text-ui-xs");
  });

  it("applies md size classes", () => {
    render(<InfoBadge size="md">Medium</InfoBadge>);
    expect(screen.getByText("Medium").className).toContain("text-xs");
  });

  it("applies lg size classes", () => {
    render(<InfoBadge size="lg">Large</InfoBadge>);
    expect(screen.getByText("Large").className).toContain("text-sm");
  });

  it("applies custom className", () => {
    render(<InfoBadge className="extra">Test</InfoBadge>);
    expect(screen.getByText("Test").className).toContain("extra");
  });
});
