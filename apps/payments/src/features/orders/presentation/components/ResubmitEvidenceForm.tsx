"use client";

import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { tid } from "shared";

import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
} from "@/features/orders/domain/constants";

interface ResubmitEvidenceFormProps {
  orderId: string;
  sellerNote: string | null;
  onSubmit: (transferNumber: string, receiptFile: File | null) => void;
  isPending: boolean;
}

export function ResubmitEvidenceForm({
  orderId,
  sellerNote,
  onSubmit,
  isPending,
}: ResubmitEvidenceFormProps) {
  const t = useTranslations("orders");
  const receiptInputId = useId();
  const [transferNumber, setTransferNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync with state for unmount cleanup
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!file) return;

      if (file.size > MAX_RECEIPT_SIZE_BYTES) {
        return;
      }

      setReceiptFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [],
  );

  const handleRemoveFile = useCallback(() => {
    setReceiptFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  const handleSubmit = useCallback(() => {
    if (!transferNumber.trim()) return;
    onSubmit(transferNumber.trim(), receiptFile);
  }, [transferNumber, receiptFile, onSubmit]);

  return (
    <div className="space-y-4" {...tid(`resubmit-form-${orderId}`)}>
      {/* Seller note */}
      {sellerNote && (
        <div className="border-2 border-warning/40 bg-warning/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-display text-xs font-extrabold uppercase tracking-wider text-warning">
                {t("sellerNote")}
              </p>
              <p className="mt-1 text-sm">{sellerNote}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{t("resubmitHint")}</p>

      {/* Transfer number */}
      <div>
        <label
          htmlFor={`transfer-${orderId}`}
          className="font-display text-xs font-extrabold uppercase tracking-wider"
        >
          {t("transferNumber")}
        </label>
        <input
          id={`transfer-${orderId}`}
          type="text"
          value={transferNumber}
          onChange={(e) => setTransferNumber(e.target.value)}
          disabled={isPending}
          className="mt-1 w-full border-3 border-foreground bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-50"
          {...tid(`resubmit-transfer-${orderId}`)}
        />
      </div>

      {/* Receipt upload */}
      <div>
        <label
          htmlFor={receiptInputId}
          className="font-display text-xs font-extrabold uppercase tracking-wider"
        >
          {t("uploadReceipt")}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t("maxFileSize")}
        </p>

        {previewUrl && receiptFile ? (
          <div className="relative mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={t("receiptPreview")}
              className="max-h-32 border-2 border-foreground object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isPending}
              aria-label={t("removeReceipt")}
              className="absolute -top-2 -right-2 border-2 border-foreground bg-destructive p-0.5 text-white hover:opacity-80 disabled:opacity-50"
              {...tid(`resubmit-remove-receipt-${orderId}`)}
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="mt-2 flex items-center gap-2 border-3 border-dashed border-muted-foreground px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            {...tid(`resubmit-upload-btn-${orderId}`)}
          >
            <Upload className="size-4" />
            {t("uploadReceipt")}
          </button>
        )}

        <input
          id={receiptInputId}
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_RECEIPT_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !transferNumber.trim()}
        className="nb-btn nb-btn-press-sm nb-shadow-sm inline-flex items-center gap-2 border-3 border-foreground bg-foreground px-5 py-2.5 font-display text-sm font-extrabold uppercase tracking-widest text-background disabled:opacity-50"
        {...tid(`resubmit-submit-${orderId}`)}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </button>
    </div>
  );
}
