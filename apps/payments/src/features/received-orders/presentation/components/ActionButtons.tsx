"use client";

import { Check, MessageSquareWarning, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import { ConfirmActionPanel } from "./ConfirmActionPanel";
import { SellerNoteInput } from "./SellerNoteInput";

import {
  canActOnOrder,
  canRequestEvidence,
  type ReceivedOrderStatus,
  type SellerAction,
} from "@/features/received-orders/domain/types";

interface ActionButtonsProps {
  orderId: string;
  status: ReceivedOrderStatus;
  onAction: (action: SellerAction, note?: string) => void;
  isPending: boolean;
  canManage?: boolean;
}

type ActionMode = "approve" | "reject" | "evidence" | null;

export function ActionButtons({
  orderId,
  status,
  onAction,
  isPending,
  canManage = true,
}: ActionButtonsProps) {
  const t = useTranslations("receivedOrders");
  const [mode, setMode] = useState<ActionMode>(null);

  const canApprove = canActOnOrder(status);
  const canReject = canActOnOrder(status);
  const canEvidence = canRequestEvidence(status);

  const handleConfirmApprove = useCallback(() => {
    onAction("approved");
    setMode(null);
  }, [onAction]);

  const handleNoteSubmit = useCallback(
    (note: string) => {
      if (mode === "reject") {
        onAction("rejected", note);
      } else if (mode === "evidence") {
        onAction("evidence_requested", note);
      }
      setMode(null);
    },
    [mode, onAction],
  );

  if (!canManage || (!canApprove && !canReject)) return null;

  // Approve — inline confirmation with checkbox
  if (mode === "approve") {
    return (
      <ConfirmActionPanel
        warning={t("approveWarning")}
        checkboxLabel={t("approveCheckbox")}
        confirmLabel={t("confirmApprove")}
        cancelLabel={t("cancel")}
        variant="approve"
        onConfirm={handleConfirmApprove}
        onCancel={() => setMode(null)}
        isPending={isPending}
      />
    );
  }

  // Reject — note input (required reason)
  if (mode === "reject") {
    return (
      <SellerNoteInput
        onSubmit={handleNoteSubmit}
        onCancel={() => setMode(null)}
        isPending={isPending}
        placeholder={t("notePlaceholder")}
      />
    );
  }

  // Evidence request — simple note input (not destructive)
  if (mode === "evidence") {
    return (
      <SellerNoteInput
        onSubmit={handleNoteSubmit}
        onCancel={() => setMode(null)}
        isPending={isPending}
        placeholder={t("notePlaceholder")}
      />
    );
  }

  // Default: action buttons
  return (
    <div className="flex flex-col gap-3" {...tid(`order-actions-${orderId}`)}>
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <Button
            type="button"
            onClick={() => setMode("approve")}
            disabled={isPending}
            className="button-brutal rounded-lg border-strong border-foreground bg-success px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-success-foreground"
            {...tid(`order-approve-${orderId}`)}
          >
            <Check className="size-4" />
            {t("approve")}
          </Button>
        )}
        {canReject && (
          <Button
            type="button"
            onClick={() => setMode("reject")}
            disabled={isPending}
            className="button-brutal rounded-lg border-strong border-foreground bg-destructive px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-destructive-foreground"
            {...tid(`order-reject-${orderId}`)}
          >
            <X className="size-4" />
            {t("reject")}
          </Button>
        )}
        {canEvidence && (
          <Button
            type="button"
            onClick={() => setMode("evidence")}
            disabled={isPending}
            className="button-brutal rounded-lg border-strong border-foreground bg-warning px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-warning-foreground"
            {...tid(`order-evidence-${orderId}`)}
          >
            <MessageSquareWarning className="size-4" />
            {t("requestEvidence")}
          </Button>
        )}
      </div>
    </div>
  );
}
