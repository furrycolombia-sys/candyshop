import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `translated:${key}`,
}));

import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("renders without crashing", () => {
    render(<LoadingState />);
    const el = screen.getByTestId("loading-state");
    expect(el).toBeInTheDocument();
  });

  it("displays translated loading message by default", () => {
    render(<LoadingState />);
    expect(screen.getByText("translated:loading")).toBeInTheDocument();
  });

  it("displays custom message when provided", () => {
    render(<LoadingState message="Please wait..." />);
    expect(screen.getByText("Please wait...")).toBeInTheDocument();
  });

  it("applies custom height class", () => {
    render(<LoadingState height="h-20" />);
    const el = screen.getByTestId("loading-state");
    expect(el.className).toContain("h-20");
  });

  it("applies default height class when not specified", () => {
    render(<LoadingState />);
    const el = screen.getByTestId("loading-state");
    expect(el.className).toContain("h-[60vh]");
  });

  it("renders a spinning icon", () => {
    render(<LoadingState />);
    const el = screen.getByTestId("loading-state");
    // The RefreshCw icon should have animate-spin class
    const svgEl = el.querySelector("svg");
    expect(svgEl).toBeInTheDocument();
    expect(svgEl?.className.baseVal || svgEl?.getAttribute("class")).toContain(
      "animate-spin",
    );
  });
});
