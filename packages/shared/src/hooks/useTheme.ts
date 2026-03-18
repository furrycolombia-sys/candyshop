"use client";

import { getCookie, setCookie } from "cookies-next";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

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

function readThemeFromCookie(): Theme {
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
    // Silent fail
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

function applyThemeToDOM(theme: Theme) {
  if (globalThis.window === undefined) return;
  const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;
  document.documentElement.classList.toggle(
    THEMES.DARK,
    effectiveTheme === THEMES.DARK,
  );
}

function resolveEffectiveTheme(
  theme: Theme,
  isMounted: boolean,
): typeof THEMES.LIGHT | typeof THEMES.DARK {
  if (!isMounted) return THEMES.LIGHT;
  if (theme === THEMES.SYSTEM) return getSystemTheme();
  return theme;
}

// Hydration-safe mounted detection via useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function useTheme() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted,
  );

  const [theme, setThemeState] = useState<Theme>(readThemeFromCookie);

  // Apply theme to DOM on mount and whenever theme changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen for system theme changes when using "system" preference
  useEffect(() => {
    if (!mounted) return;

    const handleSystemThemeChange = () => {
      if (theme === THEMES.SYSTEM) {
        applyThemeToDOM(THEMES.SYSTEM);
      }
    };

    const mediaQuery = globalThis.matchMedia(DARK_SCHEME_MEDIA_QUERY);
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    persistTheme(newTheme);
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const effectiveCurrent =
        current === THEMES.SYSTEM ? getSystemTheme() : current;
      const next =
        effectiveCurrent === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
      persistTheme(next);
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const effectiveTheme = resolveEffectiveTheme(theme, mounted);

  return { theme, effectiveTheme, setTheme, toggleTheme, mounted };
}
