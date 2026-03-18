"use client";

import { useTranslations } from "next-intl";

type AppId = "store" | "landing" | "payments" | "admin" | "auth" | "playground";

interface AppNavigationProps {
  currentApp: AppId;
  urls: Record<AppId, string>;
}

const APP_ORDER: { id: AppId; labelKey: string }[] = [
  { id: "landing", labelKey: "landing" },
  { id: "store", labelKey: "store" },
  { id: "payments", labelKey: "payments" },
  { id: "admin", labelKey: "admin" },
  { id: "auth", labelKey: "auth" },
  { id: "playground", labelKey: "playground" },
];

export function AppNavigation({ currentApp, urls }: AppNavigationProps) {
  const t = useTranslations("nav");

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
              href={urls[id]}
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
    </nav>
  );
}

export type { AppId, AppNavigationProps };
