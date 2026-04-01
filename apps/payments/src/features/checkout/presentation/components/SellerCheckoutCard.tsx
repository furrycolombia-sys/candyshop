"use client";

import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
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
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: methods = [], isLoading: isLoadingMethods } =
    useSellerPaymentMethods(sellerId);

  const selectedMethod: SellerPaymentMethodWithType | undefined = methods.find(
    (m) => m.id === selectedMethodId,
  );

  const isSubmitted = status === "submitted";
  const isSubmitting = status === "submitting";
  const isDisabled = isSubmitted || isSubmitting;

  const handleSubmit = useCallback(() => {
    if (!selectedMethodId) {
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

    setValidationError(null);
    onSubmit({
      paymentMethodId: selectedMethodId,
      transferNumber: transferNumber.trim() || null,
      receiptFile,
    });
  }, [
    selectedMethodId,
    selectedMethod,
    receiptFile,
    transferNumber,
    onSubmit,
    t,
  ]);

  return (
    <div
      className="border-strong border-foreground bg-background shadow-brutal-md"
      {...tid(`seller-checkout-${sellerId}`)}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between p-4"
        aria-expanded={isExpanded}
        {...tid(`seller-checkout-toggle-${sellerId}`)}
      >
        <div className="flex items-center gap-3">
          {isSubmitted && <CheckCircle className="size-5 text-success" />}
          <div className="text-left">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-widest">
              {sellerName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("items", { count: items.length })} &middot;{" "}
              {formatCop(subtotalCop)}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
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
          error={error}
          isLoadingMethods={isLoadingMethods}
          methods={methods}
          selectedMethodId={selectedMethodId}
          selectedMethod={selectedMethod}
          transferNumber={transferNumber}
          receiptFile={receiptFile}
          validationError={validationError}
          onSelectMethod={setSelectedMethodId}
          onTransferNumberChange={setTransferNumber}
          onReceiptFileChange={setReceiptFile}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
