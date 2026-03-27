/* eslint-disable @next/next/no-img-element -- receipt preview uses blob URL */
"use client";

import { Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { tid } from "shared";

import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
} from "@/features/checkout/domain/constants";

interface ReceiptUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function ReceiptUpload({
  file,
  onFileChange,
  disabled = false,
}: ReceiptUploadProps) {
  const t = useTranslations("checkout");
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only revoke on unmount
  }, []);

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0] ?? null;
      if (!selected) return;

      if (selected.size > MAX_RECEIPT_SIZE_BYTES) {
        // Reset input
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // Revoke existing preview URL before creating a new one
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(selected);
      });
      onFileChange(selected);
    },
    [onFileChange],
  );

  const handleRemove = useCallback(() => {
    onFileChange(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onFileChange, previewUrl]);

  return (
    <div className="space-y-2" {...tid("receipt-upload")}>
      <label className="font-display text-xs font-extrabold uppercase tracking-widest">
        {t("uploadReceipt")}
      </label>
      <p className="text-xs text-muted-foreground">{t("uploadReceiptHint")}</p>

      {file ? (
        <div className="relative border-3 border-foreground p-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={t("receiptPreview")}
              className="max-h-48 w-full object-contain"
              {...tid("receipt-preview")}
            />
          )}
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {file.name}
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -right-2 -top-2 flex size-6 items-center justify-center border-2 border-foreground bg-background text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
            aria-label={t("removeReceipt")}
            {...tid("receipt-remove")}
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="nb-btn nb-btn-press-sm flex w-full items-center justify-center gap-2 border-3 border-dashed border-foreground/40 bg-background px-4 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          {...tid("receipt-upload-trigger")}
        >
          <Upload className="size-4" />
          {t("uploadReceipt")}
        </button>
      )}

      <p className="text-xs text-muted-foreground">{t("maxFileSize")}</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_RECEIPT_TYPES}
        onChange={handleSelect}
        className="hidden"
        {...tid("receipt-file-input")}
      />
    </div>
  );
}
