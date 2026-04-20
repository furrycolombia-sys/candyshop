"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "./button";

export interface ThemeToggleProps {
  /** Current effective theme (resolved, never "system") */
  effectiveTheme: "light" | "dark";
  /** Handler called when toggle is clicked */
  onToggle: () => void;
  /** Whether the component has mounted (for hydration safety) */
  mounted: boolean;
  /** Aria label for the button (injected by app for i18n) */
  ariaLabel?: string;
  /** Aria label shown when disabled/loading (injected by app for i18n) */
  disabledAriaLabel?: string;
  /** Test ID for the button (apps should use tid() to inject this) */
  testId?: string;
}

/**
 * Pure ThemeToggle component for switching between light and dark themes.
 *
 * This component is i18n-agnostic. Apps should inject translated labels via props.
 *
 * @example
 * ```tsx
 * // In your app (with i18n)
 * const t = useTranslations("common");
 * const { effectiveTheme, toggleTheme, mounted } = useThemeContext();
 *
 * <ThemeToggle
 *   effectiveTheme={effectiveTheme}
 *   onToggle={toggleTheme}
 *   mounted={mounted}
 *   ariaLabel={effectiveTheme === "light" ? t("theme.switchToDark") : t("theme.switchToLight")}
 *   disabledAriaLabel={t("theme.toggle")}
 * />
 * ```
 */
function ThemeToggle({
  effectiveTheme,
  onToggle,
  mounted,
  ariaLabel = "Toggle theme",
  disabledAriaLabel = "Theme toggle",
  testId = "theme-toggle",
}: ThemeToggleProps) {
  // Prevent flash during hydration - show disabled state
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={disabledAriaLabel}
        disabled
        data-testid={testId} // eslint-disable-line no-restricted-syntax -- UI package cannot import tid() from shared (circular dep); testId is injected by consuming apps
      >
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={ariaLabel}
      data-testid={testId} // eslint-disable-line no-restricted-syntax -- UI package cannot import tid() from shared (circular dep); testId is injected by consuming apps
    >
      {effectiveTheme === "light" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}

export { ThemeToggle };
