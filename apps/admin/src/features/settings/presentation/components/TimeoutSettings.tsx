"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Input } from "ui";

import type { PaymentSettings } from "@/features/settings/domain/types";

interface TimeoutSettingsProps {
  settings: PaymentSettings;
  onSave: (settings: PaymentSettings) => void;
  isPending: boolean;
}

const TIMEOUT_FIELDS = [
  {
    key: "timeout_awaiting_payment_hours" as const,
    labelKey: "awaitingPayment",
    hintKey: "awaitingPaymentHint",
  },
  {
    key: "timeout_pending_verification_hours" as const,
    labelKey: "pendingVerification",
    hintKey: "pendingVerificationHint",
  },
  {
    key: "timeout_evidence_requested_hours" as const,
    labelKey: "evidenceRequested",
    hintKey: "evidenceRequestedHint",
  },
];

export function TimeoutSettings({
  settings,
  onSave,
  isPending,
}: TimeoutSettingsProps) {
  const t = useTranslations("settings");
  const [local, setLocal] = useState<PaymentSettings>(settings);

  const handleChange = (key: keyof PaymentSettings, value: number) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="border-strong border-foreground bg-background p-6 shadow-brutal-sm"
      {...tid("timeout-settings-card")}
    >
      <h2 className="mb-4 font-display text-xl font-extrabold uppercase tracking-tight">
        {t("timeouts.title")}
      </h2>

      <div className="flex flex-col gap-5">
        {TIMEOUT_FIELDS.map(({ key, labelKey, hintKey }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label
              htmlFor={key}
              className="font-display text-sm font-bold uppercase tracking-wider"
            >
              {t(`timeouts.${labelKey}`)}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id={key}
                type="number"
                min={1}
                value={local[key]}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                className="w-28 border-2 border-foreground"
                {...tid(`timeout-input-${key}`)}
              />
              <span className="text-sm text-muted-foreground">
                {t("timeouts.hours")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`timeouts.${hintKey}`)}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onSave(local)}
        disabled={isPending}
        className="mt-6 border-strong border-foreground bg-foreground px-5 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        {...tid("timeout-settings-save")}
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </div>
  );
}
