"use client";

import { Check, MessageSquareWarning, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import { SellerNoteInput } from "./SellerNoteInput";

import type {
  OrderStatus,
  SellerAction,
} from "@/features/received-orders/domain/types";

interface ActionButtonsProps {
  orderId: string;
  status: OrderStatus;
  onAction: (action: SellerAction, note?: string) => void;
  isPending: boolean;
}

type NoteMode = "reject" | "evidence" | null;

export function ActionButtons({
  orderId,
  status,
  onAction,
  isPending,
}: ActionButtonsProps) {
  const t = useTranslations("receivedOrders");
  const [noteMode, setNoteMode] = useState<NoteMode>(null);

  const canApprove =
    status === "pending_verification" || status === "evidence_requested";
  const canReject =
    status === "pending_verification" || status === "evidence_requested";
  const canRequestEvidence = status === "pending_verification";

  const handleApprove = useCallback(() => {
    if (globalThis.confirm(t("approveConfirm"))) {
      onAction("approved");
    }
  }, [onAction, t]);

  const handleNoteSubmit = useCallback(
    (note: string) => {
      if (noteMode === "reject") {
        onAction("rejected", note);
      } else if (noteMode === "evidence") {
        onAction("evidence_requested", note);
      }
      setNoteMode(null);
    },
    [noteMode, onAction],
  );

  if (!canApprove && !canReject) return null;

  return (
    <div className="flex flex-col gap-3" {...tid(`order-actions-${orderId}`)}>
      {noteMode ? (
        <SellerNoteInput
          onSubmit={handleNoteSubmit}
          onCancel={() => setNoteMode(null)}
          isPending={isPending}
          placeholder={t("notePlaceholder")}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {canApprove && (
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="nb-btn rounded-lg border-3 border-foreground bg-success px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-success-foreground"
              {...tid(`order-approve-${orderId}`)}
            >
              <Check className="size-4" />
              {t("approve")}
            </Button>
          )}
          {canReject && (
            <Button
              type="button"
              onClick={() => setNoteMode("reject")}
              disabled={isPending}
              className="nb-btn rounded-lg border-3 border-foreground bg-destructive px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-destructive-foreground"
              {...tid(`order-reject-${orderId}`)}
            >
              <X className="size-4" />
              {t("reject")}
            </Button>
          )}
          {canRequestEvidence && (
            <Button
              type="button"
              onClick={() => setNoteMode("evidence")}
              disabled={isPending}
              className="nb-btn rounded-lg border-3 border-foreground bg-warning px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-warning-foreground"
              {...tid(`order-evidence-${orderId}`)}
            >
              <MessageSquareWarning className="size-4" />
              {t("requestEvidence")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
