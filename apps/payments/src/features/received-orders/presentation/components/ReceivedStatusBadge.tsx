"use client";

import {
  CheckCircle,
  Clock,
  MessageSquareWarning,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { OrderStatus } from "@/features/received-orders/domain/types";

const WARNING_STYLE = "border-warning bg-warning/10 text-warning";

const STATUS_CONFIG: Record<string, { icon: typeof Clock; className: string }> =
  {
    pending_verification: {
      icon: Clock,
      className: WARNING_STYLE,
    },
    evidence_requested: {
      icon: MessageSquareWarning,
      className: WARNING_STYLE,
    },
    approved: {
      icon: CheckCircle,
      className: "border-success bg-success/10 text-success",
    },
    rejected: {
      icon: XCircle,
      className: "border-destructive bg-destructive/10 text-destructive",
    },
    expired: {
      icon: ShieldAlert,
      className: "border-muted-foreground bg-muted text-muted-foreground",
    },
  };

export function ReceivedStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("receivedOrders.filters");
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${config.className}`}
      {...tid("order-status-badge")}
    >
      <Icon className="size-3.5" />
      {t(
        status as
          | "approved"
          | "rejected"
          | "pending_verification"
          | "evidence_requested",
      )}
    </span>
  );
}
