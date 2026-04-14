import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("renders null when data is empty", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an svg element when data is provided", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders a line path", () => {
    const { container } = render(<Sparkline data={[10, 20, 30]} />);
    // There should be at least 2 paths: area fill and line
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("does not render dots by default", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("renders dots when showDots is true", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} showDots />);
    expect(container.querySelectorAll("circle")).toHaveLength(3);
  });

  it("applies custom height", () => {
    const { container } = render(<Sparkline data={[1, 2]} height={64} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("height", "64");
  });

  it("applies custom className", () => {
    const { container } = render(
      <Sparkline data={[1, 2]} className="my-sparkline" />,
    );
    expect(container.firstChild).toHaveClass("my-sparkline");
  });

  it("handles single data point", () => {
    const { container } = render(<Sparkline data={[42]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("handles data with equal values", () => {
    const { container } = render(<Sparkline data={[5, 5, 5]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
