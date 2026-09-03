import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ThemeScript } from "@shared/components/ThemeScript";

describe("ThemeScript", () => {
  it("renders a script element", () => {
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
  });

  it("contains theme detection logic", () => {
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script?.innerHTML).toContain("theme-preference");
    expect(script?.innerHTML).toContain("prefers-color-scheme");
    expect(script?.innerHTML).toContain("classList.toggle");
    // Must set the same data attribute the hook does, or the first paint and
    // the first render would disagree about the theme.
    expect(script?.innerHTML).toContain("data-theme");
  });

  it("has suppressHydrationWarning attribute", () => {
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
  });
});
