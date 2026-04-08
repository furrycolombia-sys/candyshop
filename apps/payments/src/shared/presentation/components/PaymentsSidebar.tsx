"use client";

import { matchesPermissions, useCurrentUserPermissions } from "auth/client";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Package,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { Link } from "@/shared/infrastructure/i18n";

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  required: readonly string[];
};

type NavSection = {
  labelKey: string;
  items: readonly NavItem[];
};

const ORDER_READ_PERMISSIONS = ["orders.read"] as const;
const CHECKOUT_PERMISSIONS = ["orders.create", "receipts.create"] as const;
const SALES_PERMISSIONS = [
  ...ORDER_READ_PERMISSIONS,
  "orders.update",
  "receipts.read",
] as const;
const SELLER_PAYMENT_METHOD_PERMISSIONS = [
  "seller_payment_methods.read",
] as const;

const NAV_SECTIONS: readonly NavSection[] = [
  {
    labelKey: "buyer" as const,
    items: [
      {
        key: "checkout" as const,
        href: "/checkout",
        icon: ShoppingCart,
        required: CHECKOUT_PERMISSIONS,
      },
      {
        key: "myPurchases" as const,
        href: "/purchases",
        icon: Package,
        required: ORDER_READ_PERMISSIONS,
      },
    ],
  },
  {
    labelKey: "seller" as const,
    items: [
      {
        key: "paymentMethods" as const,
        href: "/payment-methods",
        icon: CreditCard,
        required: SELLER_PAYMENT_METHOD_PERMISSIONS,
      },
      {
        key: "sales" as const,
        href: "/sales",
        icon: ClipboardCheck,
        required: SALES_PERMISSIONS,
      },
    ],
  },
] as const;

const COLLAPSED_WIDTH_CLASS = "w-sidebar-collapsed";
const INACTIVE_LINK_CLASS =
  "text-muted-foreground hover:bg-muted hover:text-foreground";

export function PaymentsSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { grantedKeys, isLoading } = useCurrentUserPermissions();

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      isLoading ? false : matchesPermissions(grantedKeys, item.required),
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`relative flex shrink-0 flex-col border-r-3 border-foreground bg-background transition-all duration-300 ease-in-out ${
        collapsed ? COLLAPSED_WIDTH_CLASS : "w-60"
      }`}
      {...tid("payments-sidebar")}
    >
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

      <nav className="flex flex-1 flex-col gap-1 px-2.5 pt-10">
        {visibleSections.map((section) => (
          <div key={section.labelKey} className="mb-2">
            {!collapsed && (
              <span className="text-section-label mb-1.5 block px-2 font-mono text-muted-foreground/60">
                {t(section.labelKey)}
              </span>
            )}

            <div className="flex flex-col gap-0.5">
              {section.items.map(({ key, href, icon }) => {
                const NavIcon = icon;
                const isActive =
                  href === appPath || appPath.startsWith(`${href}/`);

                return (
                  <Link
                    key={key}
                    href={href}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-2 transition-all duration-150 ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-foreground text-background"
                        : INACTIVE_LINK_CLASS
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    {...tid(`sidebar-${key}`)}
                  >
                    {isActive && (
                      <span className="absolute left-0 inset-y-1 w-sidebar-indicator rounded-r-full bg-pink" />
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
    </aside>
  );
}
