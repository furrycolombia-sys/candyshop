"use client";

import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";

import { useResubmitEvidence } from "@/features/orders/application/hooks/useResubmitEvidence";
import type { OrderWithItems } from "@/features/orders/domain/types";
import { ExpirationLabel } from "@/features/orders/presentation/components/ExpirationLabel";
import { OrderItemsList } from "@/features/orders/presentation/components/OrderItemsList";
import { OrderStatusBadge } from "@/features/orders/presentation/components/OrderStatusBadge";
import { StatusContent } from "@/features/orders/presentation/components/StatusContent";
import { formatCop } from "@/shared/application/utils/formatCop";

const TERMINAL_STATUSES = new Set(["approved", "rejected", "expired"]);

interface OrderCardProps {
  order: OrderWithItems;
}

function getOrderBannerClass(status: OrderWithItems["payment_status"]): string {
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

export function OrderCard({ order }: OrderCardProps) {
  const t = useTranslations("orders");
  const [isExpanded, setIsExpanded] = useState(
    order.payment_status === "evidence_requested",
  );
  const resubmit = useResubmitEvidence();

  const handleResubmit = useCallback(
    (transferNumber: string, receiptFile: File | null) => {
      resubmit.mutate({ orderId: order.id, transferNumber, receiptFile });
    },
    [resubmit, order.id],
  );

  const isTerminal = TERMINAL_STATUSES.has(order.payment_status);

  return (
    <div
      className="overflow-hidden border-strong border-foreground bg-background shadow-card"
      {...tid(`order-card-${order.id}`)}
    >
      {/* Status banner — full width at top */}
      <div
        className={`px-4 py-2.5 ${getOrderBannerClass(order.payment_status)}`}
      >
        <OrderStatusBadge status={order.payment_status} />
      </div>

      {/* Seller */}
      <div className="px-4 pb-1 pt-3">
        <span className="font-mono text-xs text-muted-foreground">
          {order.seller_name}
        </span>
      </div>

      {/* Items — always visible */}
      <div className="px-4 py-2">
        <OrderItemsList items={order.items} />
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t-2 border-dashed border-muted-foreground/20 px-4 py-3">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("total")}
        </span>
        <span className="font-display text-lg font-extrabold">
          {formatCop(order.total_cop)}
        </span>
      </div>

      {/* Expiration — if applicable */}
      {order.expires_at && !isTerminal && (
        <div className="flex items-center gap-1.5 border-t border-muted-foreground/10 px-4 py-2 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <ExpirationLabel expiresAt={order.expires_at} />
        </div>
      )}

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="flex w-full items-center justify-center gap-1 border-t-2 border-muted-foreground/10 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30"
        aria-expanded={isExpanded}
        {...tid(`order-card-toggle-${order.id}`)}
      >
        {isExpanded ? (
          <>
            {t("hideDetails")} <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            {t("viewDetails")} <ChevronDown className="size-3" />
          </>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t-strong border-foreground p-4">
          <StatusContent
            order={order}
            onResubmit={handleResubmit}
            isPending={resubmit.isPending}
          />
        </div>
      )}
    </div>
  );
}
