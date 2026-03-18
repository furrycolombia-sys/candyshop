import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useTheme } from "./useTheme";

const DARK_MODE_MEDIA_QUERY = "(prefers-color-scheme: dark)";
const STORAGE_KEY = "theme-preference";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Setup localStorage mock before tests
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: mockMatchMedia,
});

// Setup default mock implementation
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
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
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

    // Wait for mount effect to settle
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
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "light");
  });

  it("should set theme to dark", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "dark");
  });

  it("should set theme to system", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("system");
    });

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      "system",
    );
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
    localStorageMock.getItem.mockReturnValue("invalid");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
  });

  it("should initialize from stored theme", async () => {
    localStorageMock.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should handle localStorage getItem errors gracefully", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("Storage read error");
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
    expect(result.current.effectiveTheme).toBe("light");
  });

  it("should handle localStorage errors gracefully", async () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const { result } = renderHook(() => useTheme());

    expect(() => {
      act(() => {
        result.current.setTheme("dark");
      });
    }).not.toThrow();
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

  it("should ignore storage events for other keys", async () => {
    const { result } = renderHook(() => useTheme());

    await act(async () => {
      result.current.setTheme("dark");
    });

    // Mock storage event for different key
    const mockStorageEvent = new StorageEvent("storage", {
      key: "other-key",
      newValue: "some-value",
      oldValue: null,
    });

    await act(async () => {
      globalThis.dispatchEvent(mockStorageEvent);
    });

    expect(result.current.theme).toBe("dark");
    expect(result.current.effectiveTheme).toBe("dark");
  });

  it("should return mounted state correctly", async () => {
    const { result } = renderHook(() => useTheme());

    // Should be mounted after initial render effect settles
    await waitFor(() => {
      expect(result.current.mounted).toBe(true);
    });
  });
});
