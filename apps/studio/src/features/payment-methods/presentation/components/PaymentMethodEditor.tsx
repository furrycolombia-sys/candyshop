"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Button, Switch } from "ui";

import { SELLER_PAYMENT_METHOD_DEFAULTS } from "@/features/payment-methods/domain/constants";
import type {
  PaymentMethodType,
  SellerPaymentMethodFormValues,
} from "@/features/payment-methods/domain/types";

const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs";

interface PaymentMethodEditorProps {
  types: PaymentMethodType[];
  initial?: SellerPaymentMethodFormValues;
  onSave: (values: SellerPaymentMethodFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function PaymentMethodEditor({
  types,
  initial,
  onSave,
  onCancel,
  isPending,
}: PaymentMethodEditorProps) {
  const t = useTranslations("paymentMethods");
  const locale = useLocale();
  const isEditing = !!initial?.type_id;

  const [form, setForm] = useState<SellerPaymentMethodFormValues>(
    initial ?? SELLER_PAYMENT_METHOD_DEFAULTS,
  );

  const handleChange = (
    field: keyof SellerPaymentMethodFormValues,
    value: string | boolean,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(form);
  };

  const getTypeName = (type: PaymentMethodType): string => {
    return locale === "es" ? type.name_es : type.name_en;
  };

  return (
    <div
      className="flex flex-col gap-6 rounded-xl border-3 border-border bg-background p-6 nb-shadow-md"
      {...tid("payment-method-editor")}
    >
      <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
        {isEditing ? t("editMethod") : t("addMethod")}
      </h2>

      {/* Payment Type */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="type_id"
          className="text-sm font-semibold"
          {...tid("payment-method-type-label")}
        >
          {t("selectType")}
        </label>
        <select
          id="type_id"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
          value={form.type_id}
          onChange={(e) => handleChange("type_id", e.target.value)}
          disabled={isEditing}
          {...tid("payment-method-type-select")}
        >
          <option value="">{t("selectTypePlaceholder")}</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {getTypeName(type)}
            </option>
          ))}
        </select>
      </div>

      {/* Account Details (EN) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="account_details_en" className="text-sm font-semibold">
          {t("accountDetails")}{" "}
          {/* eslint-disable-next-line i18next/no-literal-string -- language code */}
          {"(EN)"}
        </label>
        <textarea
          id="account_details_en"
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder={t("accountDetailsHint")}
          value={form.account_details_en}
          onChange={(e) => handleChange("account_details_en", e.target.value)}
          {...tid("payment-method-account-en")}
        />
      </div>

      {/* Account Details (ES) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="account_details_es" className="text-sm font-semibold">
          {t("accountDetails")}{" "}
          {/* eslint-disable-next-line i18next/no-literal-string -- language code */}
          {"(ES)"}
        </label>
        <textarea
          id="account_details_es"
          className={TEXTAREA_CLASS}
          rows={3}
          placeholder={t("accountDetailsHint")}
          value={form.account_details_es}
          onChange={(e) => handleChange("account_details_es", e.target.value)}
          {...tid("payment-method-account-es")}
        />
      </div>

      {/* Seller Note (EN) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="seller_note_en" className="text-sm font-semibold">
          {t("sellerNote")}{" "}
          {/* eslint-disable-next-line i18next/no-literal-string -- language code */}
          {"(EN)"}
        </label>
        <textarea
          id="seller_note_en"
          className={TEXTAREA_CLASS}
          rows={2}
          placeholder={t("sellerNoteHint")}
          value={form.seller_note_en}
          onChange={(e) => handleChange("seller_note_en", e.target.value)}
          {...tid("payment-method-note-en")}
        />
      </div>

      {/* Seller Note (ES) */}
      <div className="flex flex-col gap-2">
        <label htmlFor="seller_note_es" className="text-sm font-semibold">
          {t("sellerNote")}{" "}
          {/* eslint-disable-next-line i18next/no-literal-string -- language code */}
          {"(ES)"}
        </label>
        <textarea
          id="seller_note_es"
          className={TEXTAREA_CLASS}
          rows={2}
          placeholder={t("sellerNoteHint")}
          value={form.seller_note_es}
          onChange={(e) => handleChange("seller_note_es", e.target.value)}
          {...tid("payment-method-note-es")}
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked: boolean) =>
            handleChange("is_active", checked)
          }
          {...tid("payment-method-active-toggle")}
        />
        <label className="text-sm font-semibold">{t("active")}</label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="nb-btn nb-shadow-md nb-btn-press-sm rounded-xl border-3 bg-brand px-6 py-3 text-brand-foreground hover:bg-brand-hover"
          disabled={isPending || !form.type_id}
          onClick={handleSubmit}
          {...tid("payment-method-save")}
        >
          {isPending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-3 px-6 py-3"
          onClick={onCancel}
          {...tid("payment-method-cancel")}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
