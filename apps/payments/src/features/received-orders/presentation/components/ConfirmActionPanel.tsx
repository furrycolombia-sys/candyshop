"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

interface ConfirmActionPanelProps {
  warning: string;
  checkboxLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "approve" | "reject";
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function ConfirmActionPanel({
  warning,
  checkboxLabel,
  confirmLabel,
  cancelLabel,
  variant,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmActionPanelProps) {
  const [checked, setChecked] = useState(false);

  const handleConfirm = useCallback(() => {
    if (checked) onConfirm();
  }, [checked, onConfirm]);

  const borderColor =
    variant === "approve" ? "border-success/50" : "border-destructive/50";
  const bgColor = variant === "approve" ? "bg-success/5" : "bg-destructive/5";
  const btnBg =
    variant === "approve"
      ? "bg-success text-success-foreground"
      : "bg-destructive text-destructive-foreground";

  return (
    <div
      className={`space-y-3 border-strong ${borderColor} ${bgColor} p-4`}
      {...tid("confirm-action-panel")}
    >
      {/* Warning */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-5 shrink-0 text-warning" />
        <p className="text-sm">{warning}</p>
      </div>

      {/* Checkbox */}
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-foreground"
          {...tid("confirm-checkbox")}
        />
        <span className="text-sm font-medium">{checkboxLabel}</span>
      </label>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!checked || isPending}
          className={`button-brutal rounded-lg border-strong border-foreground px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${btnBg}`}
          {...tid("confirm-action-submit")}
        >
          {isPending ? "..." : confirmLabel}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="button-brutal rounded-lg border-strong border-foreground bg-background px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider"
          {...tid("confirm-action-cancel")}
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
