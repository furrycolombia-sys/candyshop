"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button, Input } from "ui";

interface DelegateOrderActionsProps {
  orderId: string;
  canApprove: boolean;
  canRequestProof: boolean;
  onApprove: (orderId: string) => void;
  onRequestProof: (orderId: string, sellerNote: string) => void;
  isPending?: boolean;
}

export function DelegateOrderActions({
  orderId,
  canApprove,
  canRequestProof,
  onApprove,
  onRequestProof,
  isPending,
}: DelegateOrderActionsProps) {
  const t = useTranslations("sellerAdmins");
  const [sellerNote, setSellerNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleApproveClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirmApprove = useCallback(() => {
    if (!confirmed) return;
    onApprove(orderId);
    setShowConfirm(false);
    setConfirmed(false);
  }, [confirmed, onApprove, orderId]);

  const handleRequestProof = useCallback(() => {
    if (!sellerNote.trim()) return;
    onRequestProof(orderId, sellerNote.trim());
    setSellerNote("");
  }, [sellerNote, onRequestProof, orderId]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {canApprove && (
          <Button
            size="sm"
            {...tid(`delegate-action-approve-${orderId}`)}
            onClick={handleApproveClick}
            disabled={isPending}
          >
            {t("approve")}
          </Button>
        )}
        {canRequestProof && (
          <Button
            size="sm"
            variant="outline"
            {...tid(`delegate-action-request-proof-${orderId}`)}
            onClick={handleRequestProof}
            disabled={isPending || !sellerNote.trim()}
          >
            {t("requestProof")}
          </Button>
        )}
      </div>

      {canRequestProof && (
        <Input
          {...tid("delegate-seller-note-input")}
          placeholder={t("sellerNotePlaceholder")}
          value={sellerNote}
          onChange={(e) => setSellerNote(e.target.value)}
          className="text-sm"
        />
      )}

      {showConfirm && (
        <div className="rounded-md border p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...tid("delegate-confirm-checkbox")}
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {t("confirmApprove")}
          </label>
          <Button
            size="sm"
            {...tid("delegate-confirm-submit")}
            onClick={handleConfirmApprove}
            disabled={!confirmed || isPending}
          >
            {t("confirmSubmit")}
          </Button>
        </div>
      )}
    </div>
  );
}
