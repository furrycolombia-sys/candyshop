"use client";

import { useLocale, useTranslations } from "next-intl";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

type AppId = "store" | "landing" | "payments" | "admin" | "auth" | "playground";

interface AppNavigationProps {
  currentApp: AppId;
  urls: Record<AppId, string>;
  locales: readonly string[];
}

const APP_ORDER: { id: AppId; labelKey: string }[] = [
  { id: "landing", labelKey: "landing" },
  { id: "store", labelKey: "store" },
  { id: "payments", labelKey: "payments" },
  { id: "admin", labelKey: "admin" },
  { id: "auth", labelKey: "auth" },
  { id: "playground", labelKey: "playground" },
];

export function AppNavigation({
  currentApp,
  urls,
  locales,
}: AppNavigationProps) {
  const t = useTranslations("nav");
  const locale = useLocale();

  /** Append current locale to cross-app URL so the target app opens in the same language */
  function localizedHref(baseUrl: string): string {
    // For absolute URLs (http://...), append /{locale} path
    if (/^https?:\/\//.test(baseUrl)) {
      return `${baseUrl.replace(/\/$/, "")}/${locale}`;
    }
    // For relative URLs (/store, /admin), append /{locale}
    return `${baseUrl.replace(/\/$/, "")}/${locale}`;
  }

  return (
    <nav className="flex w-full items-center gap-1 border-b bg-background px-4 py-2">
      <span className="mr-4 text-sm font-bold tracking-tight">
        {t("brand")}
      </span>
      <div className="flex items-center gap-1">
        {APP_ORDER.map(({ id, labelKey }) => {
          const isActive = id === currentApp;
          return (
            <a
              key={id}
              href={localizedHref(urls[id])}
              className={[
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {t(labelKey)}
            </a>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LocaleSwitcher locales={locales} />
        <ThemeToggle />
      </div>
    </nav>
  );
}

export type { AppId, AppNavigationProps };
