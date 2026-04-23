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
import { cn } from "ui";

import type { ReceivedOrderStatus } from "@/features/received-orders/domain/types";

function getWarningConfig(icon: typeof Clock) {
  return {
    icon,
    className: "border-warning bg-warning/10 text-warning",
  };
}

function getStatusConfig(status: ReceivedOrderStatus): {
  icon: typeof Clock;
  className: string;
} {
  switch (status) {
    case "pending_verification": {
      return getWarningConfig(Clock);
    }
    case "evidence_requested": {
      return getWarningConfig(MessageSquareWarning);
    }
    case "approved": {
      return {
        icon: CheckCircle,
        className: "border-success bg-success/10 text-success",
      };
    }
    case "rejected": {
      return {
        icon: XCircle,
        className: "border-destructive bg-destructive/10 text-destructive",
      };
    }
    case "expired": {
      return {
        icon: ShieldAlert,
        className: "border-muted-foreground bg-muted text-muted-foreground",
      };
    }
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${_exhaustive}`);
    }
  }
}

export function ReceivedStatusBadge({
  status,
}: {
  status: ReceivedOrderStatus;
}) {
  const t = useTranslations("receivedOrders.filters");
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider",
        config.className,
      )}
      {...tid("order-status-badge")}
    >
      <Icon className="size-3.5" />
      {t(status)}
    </span>
  );
}
