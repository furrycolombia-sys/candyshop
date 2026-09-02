import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Separator } from "./separator";

describe("Separator", () => {
  it("renders with data-slot attribute", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el).toBeInTheDocument();
  });

  it("renders horizontal orientation by default", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el).toHaveAttribute("data-orientation", "horizontal");
  });

  it("renders vertical orientation when specified", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el).toHaveAttribute("data-orientation", "vertical");
  });

  it("is decorative by default", () => {
    const { container } = render(<Separator />);
    const el = container.querySelector("[data-slot='separator']");
    // Decorative separators have role="none"
    expect(el).toHaveAttribute("role", "none");
  });

  it("has separator role when not decorative", () => {
    const { container } = render(<Separator decorative={false} />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el).toHaveAttribute("role", "separator");
  });

  it("applies custom className", () => {
    const { container } = render(<Separator className="my-sep" />);
    const el = container.querySelector("[data-slot='separator']");
    expect(el?.className).toContain("my-sep");
  });
});
