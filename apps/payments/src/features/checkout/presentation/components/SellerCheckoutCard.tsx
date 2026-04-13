"use client";

import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { tid } from "shared";

import { SellerCheckoutContent } from "./SellerCheckoutContent";

import { useSellerPaymentMethods } from "@/features/checkout/application/hooks/useSellerPaymentMethods";
import type {
  CartItem,
  CheckoutSellerStatus,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";
import { formatCop } from "@/shared/application/utils/formatCop";

interface SellerCheckoutCardProps {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotalCop: number;
  status: CheckoutSellerStatus;
  error: string | null;
  getItemName: (item: CartItem) => string;
  onSubmit: (params: {
    paymentMethodId: string;
    transferNumber: string | null;
    receiptFile: File | null;
    buyerInfo: Record<string, string>;
  }) => void;
}

export function SellerCheckoutCard({
  sellerId,
  sellerName,
  items,
  subtotalCop,
  status,
  error,
  getItemName,
  onSubmit,
}: SellerCheckoutCardProps) {
  const t = useTranslations("checkout");
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [transferNumber, setTransferNumber] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [buyerInfo, setBuyerInfo] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading: isLoadingMethods } = useSellerPaymentMethods(
    sellerId,
    items,
  );
  const methods = useMemo(() => data?.methods ?? [], [data?.methods]);
  const hasStockIssues = data?.hasStockIssues ?? false;

  const selectedMethod: SellerPaymentMethodWithType | undefined = methods.find(
    (m) => m.id === selectedMethodId,
  );
  const effectiveSelectedMethodId = selectedMethod ? selectedMethodId : null;

  const isSubmitted = status === "submitted";
  const isSubmitting = status === "submitting";
  const isDisabled = isSubmitted || isSubmitting;

  const handleSubmit = useCallback(() => {
    if (hasStockIssues) {
      return;
    }

    if (!effectiveSelectedMethodId || !selectedMethod) {
      setValidationError(t("methodRequired"));
      return;
    }

    if (selectedMethod?.requires_receipt && !receiptFile) {
      setValidationError(t("receiptRequired"));
      return;
    }

    if (selectedMethod?.requires_transfer_number && !transferNumber.trim()) {
      setValidationError(t("transferRequired"));
      return;
    }

    // Validate required buyer fields
    for (const field of selectedMethod.required_buyer_fields ?? []) {
      if (field.required && !buyerInfo[field.key]?.trim()) {
        setValidationError(
          t("buyerFieldRequired", { field: t(`buyerFields.${field.key}`) }),
        );
        return;
      }
    }

    setValidationError(null);
    onSubmit({
      paymentMethodId: effectiveSelectedMethodId,
      transferNumber: transferNumber.trim() || null,
      receiptFile,
      buyerInfo,
    });
  }, [
    effectiveSelectedMethodId,
    selectedMethod,
    receiptFile,
    transferNumber,
    buyerInfo,
    onSubmit,
    hasStockIssues,
    t,
  ]);

  return (
    <div
      className="overflow-hidden border-strong border-foreground bg-background shadow-brutal-md"
      {...tid(`seller-checkout-${sellerId}`)}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-start justify-between gap-3 p-3 sm:items-center sm:p-4"
        aria-expanded={isExpanded}
        {...tid(`seller-checkout-toggle-${sellerId}`)}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          {isSubmitted && <CheckCircle className="size-5 text-success" />}
          <div className="min-w-0 text-left">
            <h3 className="truncate font-display text-sm font-extrabold uppercase tracking-widest">
              {sellerName}
            </h3>
            <p className="text-xs text-muted-foreground sm:whitespace-nowrap">
              {t("items", { count: items.length })} &middot;{" "}
              {formatCop(subtotalCop)}
            </p>
          </div>
        </div>
        <span className="shrink-0 pt-0.5 sm:pt-0">
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <SellerCheckoutContent
          sellerId={sellerId}
          items={items}
          subtotalCop={subtotalCop}
          getItemName={getItemName}
          isSubmitted={isSubmitted}
          isSubmitting={isSubmitting}
          isDisabled={isDisabled}
          error={hasStockIssues ? "stock_error" : error}
          hasStockIssues={hasStockIssues}
          isLoadingMethods={isLoadingMethods}
          methods={methods}
          selectedMethodId={effectiveSelectedMethodId}
          selectedMethod={selectedMethod}
          transferNumber={transferNumber}
          receiptFile={receiptFile}
          buyerInfo={buyerInfo}
          validationError={validationError}
          onSelectMethod={setSelectedMethodId}
          onTransferNumberChange={setTransferNumber}
          onReceiptFileChange={setReceiptFile}
          onBuyerInfoChange={(key, value) =>
            setBuyerInfo((prev) => ({ ...prev, [key]: value }))
          }
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
