"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Theme value constants - single source of truth for theme strings
 */
export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

const STORAGE_KEY = "theme-preference";
const DARK_SCHEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): typeof THEMES.LIGHT | typeof THEMES.DARK {
  if (globalThis.window === undefined) return THEMES.LIGHT;
  return globalThis.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches
    ? THEMES.DARK
    : THEMES.LIGHT;
}

function getStoredTheme(): Theme {
  if (globalThis.window === undefined) return THEMES.SYSTEM;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (
      stored === THEMES.LIGHT ||
      stored === THEMES.DARK ||
      stored === THEMES.SYSTEM
    ) {
      return stored;
    }
  } catch {
    // Silent fail - use default
  }
  return THEMES.SYSTEM;
}

function applyTheme(theme: Theme) {
  if (globalThis.window === undefined) return;

  const root = document.documentElement;
  const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;

  root.classList.toggle(THEMES.DARK, effectiveTheme === THEMES.DARK);
}

// Use useSyncExternalStore for hydration-safe state
function subscribeToStorage(callback: () => void) {
  globalThis.addEventListener("storage", callback);
  return () => globalThis.removeEventListener("storage", callback);
}

function getStoredThemeSnapshot(): Theme {
  return getStoredTheme();
}

function getServerSnapshot(): Theme {
  return THEMES.SYSTEM;
}

// Track mounted state outside of React to avoid setState in effect
let isMountedGlobal = false;

export function useTheme() {
  // Use useSyncExternalStore for hydration-safe initial value
  const storedTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredThemeSnapshot,
    getServerSnapshot,
  );

  const [theme, setThemeState] = useState<Theme>(storedTheme);

  // Track mounted state using ref-like pattern
  const [mounted, setMountedState] = useState(isMountedGlobal);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    // Mark as mounted on first render (after hydration)
    if (!isMountedGlobal) {
      isMountedGlobal = true;
      // Use a microtask to batch the state update
      queueMicrotask(() => setMountedState(true));
    }
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!mounted) return;

    const handleSystemThemeChange = () => {
      if (theme === THEMES.SYSTEM) {
        applyTheme(THEMES.SYSTEM);
      }
    };

    const mediaQuery = globalThis.matchMedia(DARK_SCHEME_MEDIA_QUERY);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      applyTheme(newTheme);
    } catch {
      // Silent fail
    }
  };

  const toggleTheme = () => {
    const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;
    const newTheme =
      effectiveTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  };

  // Return the effective theme being displayed (always resolved, never "system")
  const resolveTheme = (): typeof THEMES.LIGHT | typeof THEMES.DARK => {
    if (!mounted) return THEMES.LIGHT;
    return theme === THEMES.SYSTEM ? getSystemTheme() : theme;
  };
  const effectiveTheme = resolveTheme();

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    mounted,
  };
}
