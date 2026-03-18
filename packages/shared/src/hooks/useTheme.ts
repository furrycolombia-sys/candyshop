"use client";

import { getCookie, setCookie } from "cookies-next";
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

const THEME_COOKIE_KEY = "theme-preference";
const THEME_MAX_AGE_SECONDS = 31_536_000; // 365 days
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
    const stored = getCookie(THEME_COOKIE_KEY);
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

function persistTheme(theme: Theme) {
  setCookie(THEME_COOKIE_KEY, theme, {
    path: "/",
    maxAge: THEME_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}

function applyTheme(theme: Theme) {
  if (globalThis.window === undefined) return;

  const root = document.documentElement;
  const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;

  root.classList.toggle(THEMES.DARK, effectiveTheme === THEMES.DARK);
}

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

let isMountedGlobal = false;

export function useTheme() {
  const storedTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredThemeSnapshot,
    getServerSnapshot,
  );

  const [theme, setThemeState] = useState<Theme>(storedTheme);
  const [mounted, setMountedState] = useState(isMountedGlobal);

  useEffect(() => {
    if (!isMountedGlobal) {
      isMountedGlobal = true;
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
    persistTheme(newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;
    const newTheme =
      effectiveTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  };

  const resolveTheme = (): typeof THEMES.LIGHT | typeof THEMES.DARK => {
    if (!mounted) return THEMES.LIGHT;
    return theme === THEMES.SYSTEM ? getSystemTheme() : theme;
  };
  const effectiveTheme = resolveTheme();

  return { theme, effectiveTheme, setTheme, toggleTheme, mounted };
}
