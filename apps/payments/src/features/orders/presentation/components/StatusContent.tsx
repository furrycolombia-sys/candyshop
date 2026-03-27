"use client";

import { CheckCircle, Clock, Hourglass, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { OrderWithItems } from "@/features/orders/domain/types";
import { ResubmitEvidenceForm } from "@/features/orders/presentation/components/ResubmitEvidenceForm";

interface StatusContentProps {
  order: OrderWithItems;
  onResubmit: (transferNumber: string, receiptFile: File | null) => void;
  isPending: boolean;
}

export function StatusContent({
  order,
  onResubmit,
  isPending,
}: StatusContentProps) {
  const t = useTranslations("orders");

  switch (order.payment_status) {
    case "evidence_requested": {
      return (
        <ResubmitEvidenceForm
          orderId={order.id}
          sellerNote={order.seller_note}
          onSubmit={onResubmit}
          isPending={isPending}
        />
      );
    }

    case "approved": {
      return (
        <div
          className="flex items-center gap-2 border-2 border-success/40 bg-success/10 p-3 text-sm text-success"
          {...tid(`order-approved-${order.id}`)}
        >
          <CheckCircle className="size-4 shrink-0" />
          {t("orderApproved")}
        </div>
      );
    }

    case "rejected": {
      return (
        <div className="space-y-2" {...tid(`order-rejected-${order.id}`)}>
          {order.seller_note && (
            <div className="border-2 border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-display text-xs font-extrabold uppercase tracking-wider text-destructive">
                {t("sellerNote")}
              </p>
              <p className="mt-1">{order.seller_note}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="size-4 shrink-0" />
            {t("orderCancelled")}
          </div>
        </div>
      );
    }

    case "pending_verification": {
      return (
        <div
          className="flex items-center gap-2 border-2 border-info/40 bg-info/10 p-3 text-sm text-info"
          {...tid(`order-pending-verification-${order.id}`)}
        >
          <Hourglass className="size-4 shrink-0" />
          {t("waitingForSeller")}
        </div>
      );
    }

    case "expired": {
      return (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          {...tid(`order-expired-${order.id}`)}
        >
          <Clock className="size-4 shrink-0" />
          {t("expired")}
        </div>
      );
    }

    default: {
      return null;
    }
  }
}
