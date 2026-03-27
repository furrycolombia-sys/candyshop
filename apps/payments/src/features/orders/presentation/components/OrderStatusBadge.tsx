"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { STATUS_COLORS } from "@/features/orders/domain/constants";
import type { OrderStatus } from "@/features/orders/domain/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("orders");

  const colorClasses = STATUS_COLORS[status] ?? STATUS_COLORS.pending;

  return (
    <span
      className={`inline-flex items-center border-2 border-foreground px-2 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider ${colorClasses}`}
      {...tid(`order-status-${status}`)}
    >
      {t(`status.${status}`)}
    </span>
  );
}
