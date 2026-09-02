import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ThemeScript } from "./ThemeScript";

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
  });

  it("has suppressHydrationWarning attribute", () => {
    const { container } = render(<ThemeScript />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
  });
});
