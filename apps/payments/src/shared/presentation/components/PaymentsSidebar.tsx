"use client";

import { useCurrentUserPermissions } from "auth/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { PaymentsSidebarNav } from "@/shared/presentation/components/PaymentsSidebarNav";

const COLLAPSED_WIDTH_CLASS = "w-sidebar-collapsed";

export function PaymentsSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { grantedKeys, isLoading } = useCurrentUserPermissions();

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  return (
    <aside
      className={`relative hidden shrink-0 flex-col border-r-3 border-foreground bg-background transition-all duration-300 ease-in-out lg:flex ${
        collapsed ? COLLAPSED_WIDTH_CLASS : "w-60"
      }`}
      data-loading={isLoading}
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

      <PaymentsSidebarNav
        appPath={appPath}
        collapsed={collapsed}
        grantedKeys={grantedKeys}
        isLoading={isLoading}
      />
    </aside>
  );
}
