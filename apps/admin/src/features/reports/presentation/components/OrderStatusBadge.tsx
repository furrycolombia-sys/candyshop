"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { OrderStatus } from "@/features/reports/domain/types";

/**
 * Colour lives in the background tint; the text does not carry it.
 *
 * `bg-X/10 text-X` puts a colour on a 10% tint of itself. axe measured the
 * equivalent on RoleBadge at 3.2:1 against a required 4.5:1, and which status
 * happens to fail is only a question of what the data contains -- the shape
 * fails for all of them. text-foreground on a near-white tint clears the
 * threshold, and the fill still carries the status colour.
 */
const STATUS_COLOR_MAP: Partial<Record<OrderStatus, string>> = {
  approved: "bg-success/10 text-foreground",
  rejected: "bg-destructive/10 text-foreground",
  // eslint-disable-next-line sonarjs/no-duplicate-string -- Tailwind utility classes must stay inline (dry-principle.md)
  expired: "bg-muted text-foreground",
  // eslint-disable-next-line sonarjs/no-duplicate-string -- Tailwind utility classes must stay inline (dry-principle.md)
  pending_verification: "bg-warning/10 text-foreground",
  evidence_requested: "bg-warning/10 text-foreground",
  awaiting_payment: "bg-info/10 text-foreground",
  pending: "bg-muted text-foreground",
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("reports");
  const colorClass = STATUS_COLOR_MAP[status] ?? "bg-muted text-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      {...tid(`order-status-badge-${status}`)}
    >
      {t(`status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}
