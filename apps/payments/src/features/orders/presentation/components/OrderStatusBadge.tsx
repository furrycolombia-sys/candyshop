"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import {
  STATUS_CLASS_DEFAULT,
  STATUS_CLASS_MAP,
} from "@/features/orders/domain/constants";
import type { OrderStatus } from "@/features/orders/domain/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("orders");
  const statusClass = STATUS_CLASS_MAP[status] ?? STATUS_CLASS_DEFAULT;

  return (
    <span
      className={cn(
        "inline-flex items-center border-2 border-foreground px-2 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider",
        statusClass,
      )}
      {...tid(`order-status-${status}`)}
    >
      {t(`status.${status}`)}
    </span>
  );
}
