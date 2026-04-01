import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `translated:${key}`,
}));

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders without crashing", () => {
    render(<EmptyState />);
    const el = screen.getByTestId("empty-state");
    expect(el).toBeInTheDocument();
  });

  it("displays custom message when provided", () => {
    render(<EmptyState message="No items found" />);
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("displays translated fallback when no message provided", () => {
    render(<EmptyState />);
    expect(screen.getByText("translated:error")).toBeInTheDocument();
  });

  it("applies custom height class", () => {
    render(<EmptyState height="h-40" />);
    const el = screen.getByTestId("empty-state");
    expect(el.className).toContain("h-40");
  });

  it("applies default height class when not specified", () => {
    render(<EmptyState />);
    const el = screen.getByTestId("empty-state");
    expect(el.className).toContain("min-h-state-pane");
  });
});
