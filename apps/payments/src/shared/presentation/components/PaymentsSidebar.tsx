"use client";

import { useCurrentUserPermissions } from "auth/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { cn } from "ui";

import { PaymentsSidebarNav } from "@/shared/presentation/components/PaymentsSidebarNav";

export function PaymentsSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { grantedKeys, isLoading } = useCurrentUserPermissions();

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-r-3 border-foreground bg-background transition-all duration-300 ease-in-out lg:flex",
        isCollapsed ? "w-sidebar-collapsed" : "w-60",
      )}
      data-loading={isLoading}
      {...tid("payments-sidebar")}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="absolute -right-3.5 top-5 z-10 flex size-7 items-center justify-center border-2 border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
        aria-label={isCollapsed ? t("expand") : t("collapse")}
        {...tid("sidebar-collapse-toggle")}
      >
        {isCollapsed ? (
          <ChevronRight className="size-4" strokeWidth={3} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={3} />
        )}
      </button>

      <PaymentsSidebarNav
        appPath={appPath}
        collapsed={isCollapsed}
        grantedKeys={grantedKeys}
        isLoading={isLoading}
      />
    </aside>
  );
}
