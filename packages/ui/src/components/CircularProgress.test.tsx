import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CircularProgress } from "./CircularProgress";

describe("CircularProgress", () => {
  it("renders an svg element", () => {
    const { container } = render(
      <CircularProgress value={50} aria-label="Analysis progress" />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows percentage text by default", () => {
    render(<CircularProgress value={75} aria-label="Analysis progress" />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("hides percentage text when showValue is false", () => {
    render(
      <CircularProgress
        value={75}
        showValue={false}
        aria-label="Analysis progress"
      />,
    );
    expect(screen.queryByText("75%")).toBeNull();
  });

  it("clamps value to 0 minimum", () => {
    render(<CircularProgress value={-20} aria-label="Analysis progress" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("clamps value to 100 maximum", () => {
    render(<CircularProgress value={200} aria-label="Analysis progress" />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("respects custom max value", () => {
    render(
      <CircularProgress value={50} max={200} aria-label="Analysis progress" />,
    );
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders two circle elements (background + progress)", () => {
    const { container } = render(
      <CircularProgress value={50} aria-label="Analysis progress" />,
    );
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  it("applies custom size via style", () => {
    const { container } = render(
      <CircularProgress value={50} size={80} aria-label="Analysis progress" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.style.width).toBe("80px");
    expect(root.style.height).toBe("80px");
  });

  it("applies custom className", () => {
    const { container } = render(
      <CircularProgress
        value={50}
        className="my-circle"
        aria-label="Analysis progress"
      />,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      "my-circle",
    );
  });

  it("rounds the displayed percentage", () => {
    render(
      <CircularProgress value={33} max={100} aria-label="Analysis progress" />,
    );
    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});
