import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="w-full h-4" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("w-full");
    expect(el.className).toContain("h-4");
  });

  it("uses shimmer variant by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("skeleton-shimmer");
  });

  it("uses pulse variant when specified", () => {
    const { container } = render(<Skeleton variant="pulse" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).not.toContain("skeleton-shimmer");
  });

  it("always includes rounded-md base class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-md");
  });

  it("passes through additional HTML attributes", () => {
    const { container } = render(<Skeleton data-testid="skel" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("data-testid", "skel");
  });
});
