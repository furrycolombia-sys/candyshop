"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Input, Switch } from "ui";

import { PAYMENT_METHOD_TYPE_FORM_DEFAULTS } from "@/features/payment-method-types/domain/constants";
import type { PaymentMethodTypeFormValues } from "@/features/payment-method-types/domain/types";

interface PaymentMethodTypeEditorProps {
  initial?: PaymentMethodTypeFormValues;
  isSaving: boolean;
  onSave: (values: PaymentMethodTypeFormValues) => void;
  onCancel: () => void;
}

export function PaymentMethodTypeEditor({
  initial,
  isSaving,
  onSave,
  onCancel,
}: PaymentMethodTypeEditorProps) {
  const t = useTranslations("paymentMethodTypes");
  const [form, setForm] = useState<PaymentMethodTypeFormValues>(
    initial ?? PAYMENT_METHOD_TYPE_FORM_DEFAULTS,
  );

  const updateField = <K extends keyof PaymentMethodTypeFormValues>(
    key: K,
    value: PaymentMethodTypeFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="flex flex-col gap-6 border-3 border-foreground bg-background p-6 nb-shadow-md"
      {...tid("payment-type-editor")}
    >
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("name")}{" "}
            {
              "(EN)" /* eslint-disable-line i18next/no-literal-string -- language code */
            }
          </label>
          <Input
            value={form.name_en}
            onChange={(e) => updateField("name_en", e.target.value)}
            {...tid("payment-type-name-en")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("name")}{" "}
            {
              "(ES)" /* eslint-disable-line i18next/no-literal-string -- language code */
            }
          </label>
          <Input
            value={form.name_es}
            onChange={(e) => updateField("name_es", e.target.value)}
            {...tid("payment-type-name-es")}
          />
        </div>
      </div>

      {/* Description fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("description")}{" "}
            {
              "(EN)" /* eslint-disable-line i18next/no-literal-string -- language code */
            }
          </label>
          <Input
            value={form.description_en}
            onChange={(e) => updateField("description_en", e.target.value)}
            {...tid("payment-type-desc-en")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("description")}{" "}
            {
              "(ES)" /* eslint-disable-line i18next/no-literal-string -- language code */
            }
          </label>
          <Input
            value={form.description_es}
            onChange={(e) => updateField("description_es", e.target.value)}
            {...tid("payment-type-desc-es")}
          />
        </div>
      </div>

      {/* Icon */}
      <div className="flex flex-col gap-1">
        <label className="font-display text-xs font-bold uppercase tracking-wider">
          {t("icon")}
        </label>
        <Input
          value={form.icon}
          onChange={(e) => updateField("icon", e.target.value)}
          placeholder="Building, Smartphone, Globe..." // eslint-disable-line i18next/no-literal-string -- icon examples
          {...tid("payment-type-icon")}
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-3 gap-6">
        <label className="flex items-center gap-3">
          <Switch
            checked={form.requires_receipt}
            onCheckedChange={(checked: boolean) =>
              updateField("requires_receipt", checked)
            }
            {...tid("payment-type-requires-receipt")}
          />
          <span className="font-display text-xs font-bold uppercase tracking-wider">
            {t("requiresReceipt")}
          </span>
        </label>

        <label className="flex items-center gap-3">
          <Switch
            checked={form.requires_transfer_number}
            onCheckedChange={(checked: boolean) =>
              updateField("requires_transfer_number", checked)
            }
            {...tid("payment-type-requires-transfer")}
          />
          <span className="font-display text-xs font-bold uppercase tracking-wider">
            {t("requiresTransferNumber")}
          </span>
        </label>

        <label className="flex items-center gap-3">
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked: boolean) =>
              updateField("is_active", checked)
            }
            {...tid("payment-type-is-active")}
          />
          <span className="font-display text-xs font-bold uppercase tracking-wider">
            {t("active")}
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t-2 border-foreground/10 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border-2 border-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted"
          {...tid("payment-type-cancel")}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="rounded-sm border-2 border-foreground bg-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          {...tid("payment-type-save")}
        >
          {isSaving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
