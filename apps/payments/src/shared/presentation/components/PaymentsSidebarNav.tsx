"use client";

import {
  matchesPermissions,
  type PermissionRequirementMode,
} from "auth/client";
import {
  ClipboardCheck,
  CreditCard,
  Package,
  ShoppingCart,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import { Link } from "@/shared/infrastructure/i18n";

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  required: readonly string[];
  mode?: PermissionRequirementMode;
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
const ASSIGNED_PERMISSIONS = [
  "orders.approve",
  "orders.request_proof",
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
  {
    labelKey: "delegate" as const,
    items: [
      {
        key: "assigned" as const,
        href: "/assigned",
        icon: UserCheck,
        required: ASSIGNED_PERMISSIONS,
        mode: "any" as const,
      },
    ],
  },
] as const;

const INACTIVE_LINK_CLASS =
  "text-muted-foreground hover:bg-muted hover:text-foreground";

export interface PaymentsSidebarNavProps {
  appPath: string;
  collapsed?: boolean;
  grantedKeys: string[];
  isLoading: boolean;
  onNavigate?: () => void;
}

export function PaymentsSidebarNav({
  appPath,
  collapsed = false,
  grantedKeys,
  isLoading,
  onNavigate,
}: PaymentsSidebarNavProps) {
  const t = useTranslations("sidebar");
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      isLoading
        ? false
        : matchesPermissions(grantedKeys, item.required, item.mode),
    ),
  })).filter((section) => section.items.length > 0);

  return (
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
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-md px-2.5 py-2 transition-all duration-150",
                    collapsed && "justify-center",
                    isActive
                      ? "bg-foreground text-background"
                      : INACTIVE_LINK_CLASS,
                  )}
                  aria-current={isActive ? "page" : undefined}
                  {...tid(`sidebar-${key}`)}
                >
                  {isActive && (
                    <span className="absolute left-0 inset-y-1 w-sidebar-indicator rounded-r-full bg-pink" />
                  )}

                  <NavIcon
                    className={cn("shrink-0", collapsed ? "size-5" : "size-4")}
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
  );
}
