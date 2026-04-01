"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { i18nField, tid } from "shared";

import type { SellerPaymentMethodWithType } from "@/features/checkout/domain/types";

interface PaymentMethodSelectorProps {
  methods: SellerPaymentMethodWithType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
  disabled = false,
}: PaymentMethodSelectorProps) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const selectId = useId();

  const getTypeName = (method: SellerPaymentMethodWithType) =>
    i18nField(method, "type_name", locale);

  const selected = methods.find((m) => m.id === selectedId);

  const getAccountDetails = (method: SellerPaymentMethodWithType) =>
    i18nField(method, "account_details", locale);

  const getSellerNote = (method: SellerPaymentMethodWithType) =>
    i18nField(method, "seller_note", locale);

  return (
    <div className="space-y-3" {...tid("payment-method-selector")}>
      <label
        htmlFor={selectId}
        className="font-display text-xs font-extrabold uppercase tracking-widest"
      >
        {t("selectPaymentMethod")}
      </label>
      <select
        id={selectId}
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="w-full border-strong border-foreground bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground disabled:cursor-not-allowed disabled:opacity-50"
        {...tid("payment-method-select")}
      >
        <option value="">{t("selectMethodPlaceholder")}</option>
        {methods.map((method) => (
          <option key={method.id} value={method.id}>
            {getTypeName(method)}
          </option>
        ))}
      </select>

      {selected && (
        <div className="space-y-2 border-2 border-foreground/20 bg-muted/30 p-3">
          {getAccountDetails(selected) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("accountDetails")}
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm"
                {...tid("payment-account-details")}
              >
                {getAccountDetails(selected)}
              </p>
            </div>
          )}
          {getSellerNote(selected) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("sellerNote")}
              </p>
              <p
                className="mt-1 whitespace-pre-wrap text-sm italic"
                {...tid("payment-seller-note")}
              >
                {getSellerNote(selected)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
