"use client";

import { matchesPermissions, useCurrentUserPermissions } from "auth/client";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Layers,
  LayoutDashboard,
  Radio,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { ADMIN_APP_ACCESS_KEYS } from "@/features/users/domain/constants";
import { Link } from "@/shared/infrastructure/i18n";

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  required: readonly string[];
  mode?: "all" | "any";
};

type NavSection = {
  labelKey: string;
  items: readonly NavItem[];
};

const NAV_SECTIONS: readonly NavSection[] = [
  {
    labelKey: "operations" as const,
    items: [
      {
        key: "dashboard" as const,
        href: "/",
        icon: LayoutDashboard,
        required: [...ADMIN_APP_ACCESS_KEYS],
        mode: "any" as const,
      },
      {
        key: "templates" as const,
        href: "/templates",
        icon: Layers,
        required: ["templates.read"],
      },
      {
        key: "paymentMethods" as const,
        href: "/payment-methods",
        icon: CreditCard,
        required: ["payment_method_types.read"],
      },
    ],
  },
  {
    labelKey: "monitoring" as const,
    items: [
      {
        key: "auditLog" as const,
        href: "/audit",
        icon: FileText,
        required: ["audit.read"],
      },
    ],
  },
  {
    labelKey: "users" as const,
    items: [
      {
        key: "users" as const,
        href: "/users",
        icon: Shield,
        required: ["user_permissions.read"],
      },
    ],
  },
  {
    labelKey: "configuration" as const,
    items: [
      {
        key: "settings" as const,
        href: "/settings",
        icon: Settings,
        required: ["payment_settings.read"],
      },
    ],
  },
] as const;

export function AdminSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { grantedKeys, isLoading } = useCurrentUserPermissions();

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      isLoading
        ? false
        : matchesPermissions(grantedKeys, item.required, item.mode ?? "all"),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r-3 border-foreground bg-background transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
      {...tid("admin-sidebar")}
    >
      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -right-3.5 top-5 z-10 flex size-7 items-center justify-center border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
        aria-label={collapsed ? t("expand") : t("collapse")}
        {...tid("sidebar-collapse-toggle")}
      >
        {collapsed ? (
          <ChevronRight className="size-4" strokeWidth={3} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={3} />
        )}
      </button>

      {/* Navigation sections */}
      <nav className="flex flex-1 flex-col gap-1 px-2.5 pt-10">
        {visibleSections.map((section) => (
          <div key={section.labelKey} className="mb-2">
            {/* Section label */}
            {!collapsed && (
              <span className="mb-1.5 block px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                {t(section.labelKey)}
              </span>
            )}

            {/* Section items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ key, href, icon }) => {
                const NavIcon = icon;
                const isActive =
                  href === "/" ? appPath === "/" : appPath.startsWith(href);

                return (
                  <Link
                    key={key}
                    href={href}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-2 transition-all duration-150 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    {...tid(`sidebar-${key}`)}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 inset-y-1 w-[3px] rounded-r-full bg-pink" />
                    )}

                    <NavIcon
                      className={`shrink-0 ${collapsed ? "size-5" : "size-4"}`}
                    />

                    {!collapsed && (
                      <span className="font-display text-sm font-bold uppercase tracking-wider">
                        {t(key)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* System status footer */}
      <div
        className={`border-t-2 border-foreground/10 px-2.5 py-3 ${collapsed ? "text-center" : ""}`}
      >
        {collapsed ? (
          <Radio className="mx-auto size-3.5 text-success animate-pulse" />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {t("status")}
              </span>
            </div>
            <span className="px-4 font-mono text-[10px] text-muted-foreground/40">
              {t("version")}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
