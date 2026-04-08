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
  permissionState?: {
    grantedKeys: string[];
    isLoading: boolean;
  };
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

const APP_ACCESS_RULES: Partial<
  Record<AppId, { required: readonly string[]; mode?: "all" | "any" }>
> = {
  studio: {
    required: [
      "products.read",
      "products.create",
      "products.update",
      "products.delete",
    ],
    mode: "any",
  },
  payments: {
    required: [
      "orders.create",
      "receipts.create",
      "orders.read",
      "seller_payment_methods.read",
      "orders.update",
      "receipts.read",
    ],
    mode: "any",
  },
  admin: {
    required: [
      "templates.read",
      "payment_method_types.read",
      "payment_settings.read",
      "audit.read",
      "user_permissions.read",
    ],
    mode: "any",
  },
};

function matchesPermissions(
  grantedKeys: string[],
  required: readonly string[],
  mode: "all" | "any" = "all",
): boolean {
  if (required.length === 0) return true;

  return mode === "any"
    ? required.some((key) => grantedKeys.includes(key))
    : required.every((key) => grantedKeys.includes(key));
}

export function AppNavigation({
  currentApp,
  urls,
  locales,
  userEmail,
  permissionState,
}: AppNavigationProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { grantedKeys, isLoading } = permissionState ?? {
    grantedKeys: [],
    isLoading: true,
  };

  /** Append current locale to cross-app URL so the target app opens in the same language */
  function localizedHref(baseUrl: string): string {
    // For absolute URLs (http://...), append /{locale} path
    if (/^https?:\/\//.test(baseUrl)) {
      return `${baseUrl.replace(/\/$/, "")}/${locale}`;
    }
    // For relative URLs (/store, /admin), append /{locale}
    return `${baseUrl.replace(/\/$/, "")}/${locale}`;
  }

  const visibleApps = APP_ORDER.filter(({ id }) => {
    const rule = APP_ACCESS_RULES[id];
    if (!rule) return true;
    if (isLoading) return false;

    return matchesPermissions(grantedKeys, rule.required, rule.mode ?? "all");
  });

  return (
    <nav
      {...tid("app-navigation")}
      className="sticky top-0 z-50 flex w-full items-center gap-1 border-b-strong border-foreground bg-background px-4 py-2"
    >
      <span className="mr-4 font-display text-sm font-extrabold tracking-tight">
        {t("brand")}
      </span>
      <div className="flex items-center gap-1">
        {visibleApps.map(({ id, labelKey }) => {
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
