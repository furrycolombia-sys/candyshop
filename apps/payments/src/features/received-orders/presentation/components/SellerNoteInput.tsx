"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

interface SellerNoteInputProps {
  onSubmit: (note: string) => void;
  onCancel: () => void;
  isPending: boolean;
  placeholder?: string;
}

export function SellerNoteInput({
  onSubmit,
  onCancel,
  isPending,
  placeholder,
}: SellerNoteInputProps) {
  const t = useTranslations("receivedOrders");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (!note.trim()) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(note.trim());
  }

  return (
    <div className="flex flex-col gap-2" {...tid("seller-note-input")}>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          if (error) setError(false);
        }}
        placeholder={placeholder ?? t("notePlaceholder")}
        aria-label={t("notePlaceholder")}
        className="min-h-[80px] w-full rounded-lg border-3 border-foreground bg-background px-3 py-2 font-mono text-sm"
        disabled={isPending}
        {...tid("seller-note-textarea")}
      />
      {error && (
        <p className="text-xs font-bold text-destructive">
          {t("noteRequired")}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="nb-btn rounded-lg border-3 border-foreground bg-foreground px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-background"
          {...tid("seller-note-submit")}
        >
          {isPending ? t("submitting") : t("approve")}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="nb-btn rounded-lg border-3 border-foreground bg-background px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-foreground"
          {...tid("seller-note-cancel")}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
