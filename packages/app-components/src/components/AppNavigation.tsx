"use client";

import { useLocale, useTranslations } from "next-intl";

import { tid } from "../utils/tid";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

type AppId =
  | "store"
  | "studio"
  | "landing"
  | "payments"
  | "admin"
  | "auth"
  | "playground";

interface AppNavigationProps {
  currentApp: AppId;
  urls: Record<AppId, string>;
  locales: readonly string[];
  userEmail?: string | null;
}

const APP_ORDER: { id: AppId; labelKey: string }[] = [
  { id: "landing", labelKey: "landing" },
  { id: "store", labelKey: "store" },
  { id: "studio", labelKey: "studio" },
  { id: "payments", labelKey: "payments" },
  { id: "admin", labelKey: "admin" },
  { id: "auth", labelKey: "auth" },
  { id: "playground", labelKey: "playground" },
];

export function AppNavigation({
  currentApp,
  urls,
  locales,
  userEmail,
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
    <nav
      {...tid("app-navigation")}
      className="sticky top-0 z-50 flex w-full items-center gap-1 border-b-[3px] border-foreground bg-background px-4 py-2"
    >
      <span className="mr-4 font-display text-sm font-extrabold tracking-tight">
        {t("brand")}
      </span>
      <div className="flex items-center gap-1">
        {APP_ORDER.map(({ id, labelKey }) => {
          const isActive = id === currentApp;
          return (
            <a
              key={id}
              {...tid(`nav-link-${id}`)}
              href={localizedHref(urls[id])}
              className={[
                "px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-2 border-foreground bg-primary text-primary-foreground"
                  : "text-foreground/60 hover:text-foreground",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {t(labelKey)}
            </a>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {userEmail ? (
          <span
            className="text-xs font-medium text-foreground/70"
            {...tid("nav-user-email")}
          >
            {userEmail}
          </span>
        ) : null}
        <LocaleSwitcher locales={locales} />
        <ThemeToggle />
      </div>
    </nav>
  );
}

export type { AppId, AppNavigationProps };
