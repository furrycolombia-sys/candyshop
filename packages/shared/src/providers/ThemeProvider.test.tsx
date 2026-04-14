import { renderHook } from "@testing-library/react";
import { deleteCookie } from "cookies-next";
import type { ReactNode } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { ThemeProvider, useThemeContext } from "./ThemeProvider";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockMatchMedia() {
  globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    deleteCookie("theme-preference");
    mockMatchMedia();
    vi.spyOn(document.documentElement.classList, "toggle").mockImplementation(
      () => false,
    );
    vi.spyOn(document.documentElement.classList, "add").mockImplementation(
      () => {},
    );
    vi.spyOn(document.documentElement.classList, "remove").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when useThemeContext is used outside ThemeProvider", () => {
    expect(() => {
      renderHook(() => useThemeContext());
    }).toThrow("useThemeContext must be used within a ThemeProvider");
  });

  it("provides theme state to children", () => {
    const { result } = renderHook(() => useThemeContext(), { wrapper });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBeDefined();
    expect(typeof result.current.setTheme).toBe("function");
    expect(typeof result.current.toggleTheme).toBe("function");
    expect(typeof result.current.mounted).toBe("boolean");
  });
});
