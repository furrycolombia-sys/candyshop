"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { tid } from "shared";
import { Input } from "ui";

interface BuyerFieldProps {
  fieldKey: string;
  fieldType: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  sellerId: string;
}

export function BuyerField({
  fieldKey,
  fieldType,
  value,
  onChange,
  disabled,
  sellerId,
}: BuyerFieldProps) {
  const t = useTranslations("checkout");
  const inputId = useId();

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="font-display text-xs font-extrabold uppercase tracking-widest"
      >
        {t(`buyerFields.${fieldKey}` as Parameters<typeof t>[0])}
      </label>
      <Input
        id={inputId}
        type={fieldType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(
          `buyerFields.${fieldKey}Hint` as Parameters<typeof t>[0],
        )}
        disabled={disabled}
        className="border-strong border-foreground rounded-none"
        {...tid(`buyer-field-${fieldKey}-${sellerId}`)}
      />
    </div>
  );
}
