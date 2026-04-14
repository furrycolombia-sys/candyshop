"use client";

import { useTranslations } from "next-intl";
import { useThemeContext } from "shared";
import { ThemeToggle as ThemeToggleUI } from "ui";

export function ThemeToggle() {
  const { effectiveTheme, toggleTheme, mounted } = useThemeContext();
  const t = useTranslations("common");

  return (
    <ThemeToggleUI
      effectiveTheme={effectiveTheme}
      onToggle={toggleTheme}
      mounted={mounted}
      ariaLabel={
        effectiveTheme === "light"
          ? t("theme.switchToDark")
          : t("theme.switchToLight")
      }
      disabledAriaLabel={t("theme.toggle")}
    />
  );
}
