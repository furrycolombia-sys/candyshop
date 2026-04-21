"use client";

import { useTranslations } from "next-intl";

import type { OrderStatus } from "@/features/reports/domain/types";
import { tid } from "@/shared/infrastructure/config/tid";

const MUTED_STYLE = "bg-muted text-muted-foreground";
const WARNING_STYLE = "bg-warning/10 text-warning";

const STATUS_COLOR_MAP: Partial<Record<OrderStatus, string>> = {
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  expired: MUTED_STYLE,
  pending_verification: WARNING_STYLE,
  evidence_requested: WARNING_STYLE,
  awaiting_payment: "bg-info/10 text-info",
  pending: MUTED_STYLE,
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("reports");
  const colorClass = STATUS_COLOR_MAP[status] ?? MUTED_STYLE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      {...tid(`order-status-badge-${status}`)}
    >
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}
