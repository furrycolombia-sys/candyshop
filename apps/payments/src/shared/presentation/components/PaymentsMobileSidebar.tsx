"use client";

import { useCurrentUserPermissions } from "auth/client";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "ui";

import { PaymentsSidebarNav } from "@/shared/presentation/components/PaymentsSidebarNav";

export function PaymentsMobileSidebar() {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const { grantedKeys, isLoading } = useCurrentUserPermissions();
  const [isOpen, setIsOpen] = useState(false);

  const appPath = pathname.replace(/^\/[a-z]{2}/, "") || "/";

  return (
    <div className="border-b-3 border-foreground bg-background px-4 py-3 lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between border-2 border-foreground bg-background px-3 py-2 text-left shadow-brutal-sm transition-colors hover:bg-muted"
            aria-label={t("menu")}
            {...tid("payments-mobile-sidebar-trigger")}
          >
            <span className="font-display text-xs font-extrabold uppercase tracking-[0.18em]">
              {t("menu")}
            </span>
            <Menu className="size-4" strokeWidth={2.5} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[18rem] border-r-3 border-foreground bg-background p-0"
        >
          <SheetHeader className="border-b-3 border-foreground px-5 py-4 text-left">
            <SheetTitle className="font-display text-lg font-extrabold uppercase tracking-[0.18em]">
              {t("menu")}
            </SheetTitle>
          </SheetHeader>
          <PaymentsSidebarNav
            appPath={appPath}
            grantedKeys={grantedKeys}
            isLoading={isLoading}
            onNavigate={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
