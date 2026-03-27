"use client";

import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

import { usePendingOrderCount } from "@/features/orders/application/hooks/usePendingOrderCount";
import { appUrls } from "@/shared/infrastructure/config";

export function PendingOrdersBadge() {
  const t = useTranslations("orders");
  const locale = useLocale();
  const { data: count } = usePendingOrderCount();

  if (!count || count === 0) return null;

  return (
    <a
      href={`${appUrls.payments}/${locale}/orders/received`}
      className="flex items-center gap-2 rounded-sm border-2 border-warning bg-warning/10 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-warning transition-colors hover:bg-warning/20"
      {...tid("pending-orders-badge")}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-warning text-[10px] font-extrabold text-background">
        {count}
      </span>
      {t("pendingOrders", { count })}
    </a>
  );
}
