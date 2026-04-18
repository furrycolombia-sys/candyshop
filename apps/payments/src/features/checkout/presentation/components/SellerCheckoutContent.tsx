"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { CheckoutItemsSummary } from "./CheckoutItemsSummary";
import { DisplayBlocksSection } from "./DisplayBlocksSection";
import { FormFieldsSection } from "./FormFieldsSection";
import { PaymentMethodSelector } from "./PaymentMethodSelector";

import type {
  CartItem,
  SellerPaymentMethodWithType,
} from "@/features/checkout/domain/types";

interface SubmissionState {
  isSubmitted: boolean;
  isSubmitting: boolean;
  isDisabled: boolean;
  error: string | null;
  hasStockIssues: boolean;
}

interface MethodSelectionState {
  isLoadingMethods: boolean;
  methods: SellerPaymentMethodWithType[];
  selectedMethodId: string | null;
  selectedMethod: SellerPaymentMethodWithType | undefined;
  onSelectMethod: (id: string | null) => void;
}

interface BuyerFormState {
  buyerSubmission: Record<string, string>;
  validationError: string | null;
  onBuyerSubmissionChange: (fieldId: string, value: string) => void;
  onFileSelected: (fieldId: string, file: File) => void;
}

export interface SellerCheckoutContentProps {
  sellerId: string;
  items: CartItem[];
  subtotalCop: number;
  getItemName: (item: CartItem) => string;
  submission: SubmissionState;
  methodSelection: MethodSelectionState;
  buyerForm: BuyerFormState;
  onSubmit: () => void;
}

export function SellerCheckoutContent({
  sellerId,
  items,
  subtotalCop,
  getItemName,
  submission,
  methodSelection,
  buyerForm,
  onSubmit,
}: SellerCheckoutContentProps) {
  const t = useTranslations("checkout");

  const { isSubmitted, isSubmitting, isDisabled, error, hasStockIssues } =
    submission;
  const {
    isLoadingMethods,
    methods,
    selectedMethodId,
    selectedMethod,
    onSelectMethod,
  } = methodSelection;
  const {
    buyerSubmission,
    validationError,
    onBuyerSubmissionChange,
    onFileSelected,
  } = buyerForm;

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

      {/* Loading */}
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

          {/* Display blocks */}
          {selectedMethod && (
            <DisplayBlocksSection
              blocks={selectedMethod.display_blocks}
              label={t("paymentInstructions")}
            />
          )}

          {/* Form fields */}
          {selectedMethod && (
            <FormFieldsSection
              fields={selectedMethod.form_fields}
              buyerSubmission={buyerSubmission}
              isDisabled={isDisabled}
              label={t("fillForm")}
              onBuyerSubmissionChange={onBuyerSubmissionChange}
              onFileSelected={onFileSelected}
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
