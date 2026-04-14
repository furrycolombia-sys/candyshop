"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { OrderStatus } from "@/features/orders/domain/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

function getStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "awaiting_payment":
    case "evidence_requested": {
      return "bg-warning/15 text-warning border-warning/30";
    }
    case "pending_verification": {
      return "bg-info/15 text-info border-info/30";
    }
    case "approved":
    case "paid": {
      return "bg-success/15 text-success border-success/30";
    }
    case "rejected": {
      return "bg-destructive/15 text-destructive border-destructive/30";
    }
    default: {
      return "bg-muted text-muted-foreground";
    }
  }
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const t = useTranslations("orders");

  return (
    <span
      className={`inline-flex items-center border-2 border-foreground px-2 py-0.5 font-display text-xs font-extrabold uppercase tracking-wider ${getStatusBadgeClass(status)}`}
      {...tid(`order-status-${status}`)}
    >
      {t(`status.${status}`)}
    </span>
  );
}
