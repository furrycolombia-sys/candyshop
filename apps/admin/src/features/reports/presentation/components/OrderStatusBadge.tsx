"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { OrderStatus } from "@/features/reports/domain/types";

const STATUS_COLOR_MAP: Partial<Record<OrderStatus, string>> = {
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  // eslint-disable-next-line sonarjs/no-duplicate-string -- Tailwind utility classes must stay inline (dry-principle.md)
  expired: "bg-muted text-muted-foreground",
  // eslint-disable-next-line sonarjs/no-duplicate-string -- Tailwind utility classes must stay inline (dry-principle.md)
  pending_verification: "bg-warning/10 text-warning",
  evidence_requested: "bg-warning/10 text-warning",
  awaiting_payment: "bg-info/10 text-info",
  pending: "bg-muted text-muted-foreground",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("reports");
  const colorClass =
    STATUS_COLOR_MAP[status] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      {...tid(`order-status-badge-${status}`)}
    >
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}
