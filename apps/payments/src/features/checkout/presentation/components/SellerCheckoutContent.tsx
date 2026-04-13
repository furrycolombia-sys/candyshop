"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { tid } from "shared";
import { Input } from "ui";

import { BuyerField } from "./BuyerField";
import { CheckoutItemsSummary } from "./CheckoutItemsSummary";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { ReceiptUpload } from "./ReceiptUpload";

import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";

interface SellerCheckoutContentProps {
  sellerId: string;
  items: CartItem[];
  subtotalCop: number;
  getItemName: (item: CartItem) => string;
  isSubmitted: boolean;
  isSubmitting: boolean;
  isDisabled: boolean;
  error: string | null;
  hasStockIssues: boolean;
  isLoadingMethods: boolean;
  methods: SellerPaymentMethodWithType[];
  selectedMethodId: string | null;
  selectedMethod: SellerPaymentMethodWithType | undefined;
  transferNumber: string;
  receiptFile: File | null;
  buyerInfo: Record<string, string>;
  validationError: string | null;
  onSelectMethod: (id: string | null) => void;
  onTransferNumberChange: (value: string) => void;
  onReceiptFileChange: (file: File | null) => void;
  onBuyerInfoChange: (key: string, value: string) => void;
  onSubmit: () => void;
}

export function SellerCheckoutContent({
  sellerId,
  items,
  subtotalCop,
  getItemName,
  isSubmitted,
  isSubmitting,
  isDisabled,
  error,
  hasStockIssues,
  isLoadingMethods,
  methods,
  selectedMethodId,
  selectedMethod,
  transferNumber,
  receiptFile,
  buyerInfo,
  validationError,
  onSelectMethod,
  onTransferNumberChange,
  onReceiptFileChange,
  onBuyerInfoChange,
  onSubmit,
}: SellerCheckoutContentProps) {
  const t = useTranslations("checkout");
  const transferInputId = useId();

  const showForm = !isSubmitted && !isLoadingMethods && !hasStockIssues;
  const showLoading = !isSubmitted && isLoadingMethods;
  const errorMessage = error === "stock_error" ? t("stockError") : error;
  const submitLabel = isSubmitting ? (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="size-4 animate-spin" />
      {t("submitting")}
    </span>
  ) : (
    t("submit")
  );

  return (
    <div className="space-y-4 border-t-2 border-foreground p-3 sm:p-4">
      {/* Items summary */}
      <CheckoutItemsSummary
        items={items}
        subtotalCop={subtotalCop}
        getItemName={getItemName}
      />

      {/* Status badges */}
      {isSubmitted && (
        <div
          className="flex items-center gap-2 border-2 border-success/30 bg-success/10 p-3 text-sm font-medium text-success"
          {...tid(`seller-checkout-submitted-${sellerId}`)}
        >
          <CheckCircle className="size-4" />
          {t("pendingVerification")}
        </div>
      )}

      {error && (
        <div
          className="border-2 border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
          {...tid(`seller-checkout-error-${sellerId}`)}
        >
          {errorMessage}
        </div>
      )}

      {/* Payment form loading */}
      {showLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Payment form */}
      {showForm && (
        <>
          <PaymentMethodSelector
            methods={methods}
            selectedId={selectedMethodId}
            onSelect={onSelectMethod}
            disabled={isDisabled}
          />

          {selectedMethod?.requires_transfer_number && (
            <div className="space-y-1">
              <label
                htmlFor={transferInputId}
                className="font-display text-xs font-extrabold uppercase tracking-widest"
              >
                {t("transferNumber")}
              </label>
              <Input
                id={transferInputId}
                value={transferNumber}
                onChange={(e) => onTransferNumberChange(e.target.value)}
                placeholder={t("transferNumberHint")}
                disabled={isDisabled}
                className="border-strong border-foreground rounded-none"
                {...tid(`transfer-number-${sellerId}`)}
              />
            </div>
          )}

          {/* Dynamic buyer fields (e.g. Nequi: cédula, email, tracking, name, sender) */}
          {(selectedMethod?.required_buyer_fields ?? []).map((field) => (
            <BuyerField
              key={field.key}
              fieldKey={field.key}
              fieldType={field.type}
              value={buyerInfo[field.key] ?? ""}
              onChange={(v) => onBuyerInfoChange(field.key, v)}
              disabled={isDisabled}
              sellerId={sellerId}
            />
          ))}

          {selectedMethod?.requires_receipt && (
            <ReceiptUpload
              file={receiptFile}
              onFileChange={onReceiptFileChange}
              disabled={isDisabled}
            />
          )}

          {validationError && (
            <p className="text-sm font-medium text-destructive">
              {validationError}
            </p>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isDisabled || !selectedMethodId}
            className="button-brutal button-press-sm shadow-brutal-sm w-full justify-center border-strong border-foreground bg-foreground px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-background transition-all disabled:cursor-not-allowed disabled:opacity-50"
            {...tid(`submit-payment-${sellerId}`)}
          >
            {submitLabel}
          </button>
        </>
      )}
    </div>
  );
}
