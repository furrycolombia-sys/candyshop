"use client";

import { ChevronDown, ChevronUp, Clock, Store } from "lucide-react";
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

function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

interface OrderCardProps {
  order: OrderWithItems;
}

export function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    order.payment_status === "evidence_requested",
  );
  const resubmit = useResubmitEvidence();

  const handleResubmit = useCallback(
    (transferNumber: string, receiptFile: File | null) => {
      resubmit.mutate({
        orderId: order.id,
        transferNumber,
        receiptFile,
      });
    },
    [resubmit, order.id],
  );

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className="nb-shadow border-3 border-foreground bg-background"
      {...tid(`order-card-${order.id}`)}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={toggleExpand}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
        {...tid(`order-card-toggle-${order.id}`)}
      >
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Store className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-display text-sm font-extrabold uppercase tracking-wider">
              {order.seller_name}
            </span>
          </div>
          <OrderStatusBadge status={order.payment_status} />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-extrabold">
            {formatCop(order.total_cop)}
          </span>
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t-3 border-foreground p-4">
          {/* Items */}
          <OrderItemsList items={order.items} />

          {/* Status-specific content */}
          <div className="mt-4">
            <StatusContent
              order={order}
              onResubmit={handleResubmit}
              isPending={resubmit.isPending}
            />
          </div>

          {/* Expiration info */}
          {order.expires_at && !isTerminalStatus(order.payment_status) && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <ExpirationLabel expiresAt={order.expires_at} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
