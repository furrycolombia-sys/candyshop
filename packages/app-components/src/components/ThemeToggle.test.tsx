import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockToggleTheme = vi.fn();
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("shared", () => ({
  useThemeContext: () => ({
    effectiveTheme: "light",
    toggleTheme: mockToggleTheme,
    mounted: true,
  }),
}));

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
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

  it("passes translated aria-label to the UI component", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    // When light theme, should pass switchToDark label
    expect(button).toHaveAttribute("aria-label", "t:theme.switchToDark");
  });
});
