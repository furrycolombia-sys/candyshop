import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders without crashing", () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("has data-slot attribute", () => {
    render(<Badge>Badge</Badge>);
    expect(screen.getByText("Badge")).toHaveAttribute("data-slot", "badge");
  });

  it("renders as a span by default", () => {
    render(<Badge>Label</Badge>);
    const el = screen.getByText("Label");
    expect(el.tagName).toBe("SPAN");
  });

  it("renders default variant", () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText("Default");
    expect(el.className).toContain("bg-brand");
  });

  it("renders secondary variant", () => {
    render(<Badge variant="secondary">Secondary</Badge>);
    const el = screen.getByText("Secondary");
    expect(el.className).toContain("bg-secondary");
  });

  it("renders destructive variant", () => {
    render(<Badge variant="destructive">Destructive</Badge>);
    const el = screen.getByText("Destructive");
    expect(el.className).toContain("bg-destructive");
  });

  it("renders success variant", () => {
    render(<Badge variant="success">Success</Badge>);
    const el = screen.getByText("Success");
    expect(el.className).toContain("bg-success");
  });

  it("renders warning variant", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const el = screen.getByText("Warning");
    expect(el.className).toContain("bg-warning");
  });

  it("renders info variant", () => {
    render(<Badge variant="info">Info</Badge>);
    const el = screen.getByText("Info");
    expect(el.className).toContain("bg-info");
  });

  it("renders outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const el = screen.getByText("Outline");
    expect(el.className).toContain("text-foreground");
  });

  it("applies custom className", () => {
    render(<Badge className="custom-class">Custom</Badge>);
    const el = screen.getByText("Custom");
    expect(el.className).toContain("custom-class");
  });
});
