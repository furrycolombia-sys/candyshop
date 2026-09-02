import { renderHook, act, waitFor } from "@testing-library/react";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useTheme } from "./useTheme";

const DARK_MODE_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const COOKIE_KEY = "theme-preference";

// Mock window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

mockMatchMedia.mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock document.documentElement
Object.defineProperty(document, "documentElement", {
  value: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
  },
  writable: true,
});

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCookie(COOKIE_KEY);
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === DARK_MODE_MEDIA_QUERY ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return default theme state", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
    expect(typeof result.current.setTheme).toBe("function");
    expect(typeof result.current.toggleTheme).toBe("function");
  });

  it("should set theme to light", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.effectiveTheme).toBe("light");
    expect(getCookie(COOKIE_KEY)).toBe("light");
  });

  it("should set theme to dark", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
    expect(getCookie(COOKIE_KEY)).toBe("dark");
  });

  it("should set theme to system", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("system");
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
    expect(getCookie(COOKIE_KEY)).toBe("system");
  });

  it("should toggle theme from light to dark", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("light");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should toggle theme from dark to light", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("dark");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.effectiveTheme).toBe("light");
  });

  it("should toggle theme from system to dark when system prefers light", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("system");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should toggle theme from system to light when system prefers dark", async () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === DARK_MODE_MEDIA_QUERY ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("system");
    });

    await act(async () => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(result.current.effectiveTheme).toBe("light");
  });

  it("should handle invalid stored theme", () => {
    setCookie(COOKIE_KEY, "invalid");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
  });

  it("should initialize from stored theme", async () => {
    setCookie(COOKIE_KEY, "dark");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should apply system theme changes when mounted", async () => {
    const changeListeners: Array<() => void> = [];
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === DARK_MODE_MEDIA_QUERY ? false : true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_event: string, handler: () => void) => {
        changeListeners.push(handler);
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });

    await act(async () => {
      result.current.setTheme("system");
    });

    for (const handler of changeListeners) handler();
    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith(
      "dark",
      false,
    );
  });

  it("should apply CSS classes correctly", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith(
      "dark",
      true,
    );

    await act(async () => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.toggle).toHaveBeenCalledWith(
      "dark",
      false,
    );
  });

  it("should return mounted state correctly", async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });
  });
});
