import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockToggleTheme = vi.fn();
let mockEffectiveTheme = "light";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  useThemeContext: () => ({
    effectiveTheme: mockEffectiveTheme,
    toggleTheme: mockToggleTheme,
    mounted: true,
  }),
}));

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffectiveTheme = "light";
  });

  it("renders without crashing", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toBeInTheDocument();
  });

  it("calls toggleTheme when clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByTestId("theme-toggle"));
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("passes switchToDark aria-label when light theme is active", () => {
    mockEffectiveTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toHaveAttribute("aria-label", "t:theme.switchToDark");
  });

  it("passes switchToLight aria-label when dark theme is active", () => {
    mockEffectiveTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toHaveAttribute("aria-label", "t:theme.switchToLight");
  });
});
