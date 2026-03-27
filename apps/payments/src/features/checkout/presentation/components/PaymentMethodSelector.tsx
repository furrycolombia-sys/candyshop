"use client";

import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

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

  const getTypeName = (method: SellerPaymentMethodWithType) =>
    locale === "es" ? method.type_name_es : method.type_name_en;

  const selected = methods.find((m) => m.id === selectedId);

  const getAccountDetails = (method: SellerPaymentMethodWithType) =>
    locale === "es" ? method.account_details_es : method.account_details_en;

  const getSellerNote = (method: SellerPaymentMethodWithType) =>
    locale === "es" ? method.seller_note_es : method.seller_note_en;

  return (
    <div className="space-y-3" {...tid("payment-method-selector")}>
      <label className="font-display text-xs font-extrabold uppercase tracking-widest">
        {t("selectPaymentMethod")}
      </label>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="w-full border-3 border-foreground bg-background px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
