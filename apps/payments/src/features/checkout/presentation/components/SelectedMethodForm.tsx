"use client";

import { useTranslations } from "next-intl";

import { DisplayBlocksSection } from "./DisplayBlocksSection";
import { FormFieldsSection } from "./FormFieldsSection";
import { ReceiptUpload } from "./ReceiptUpload";

import type { SellerPaymentMethodWithType } from "@/features/checkout/domain/types";

interface SelectedMethodFormProps {
  method: SellerPaymentMethodWithType;
  buyerSubmission: Record<string, string>;
  transferNumber: string;
  receiptFile: File | null;
  isDisabled: boolean;
  onBuyerSubmissionChange: (fieldId: string, value: string) => void;
  onTransferNumberChange: (value: string) => void;
  onReceiptChange: (file: File | null) => void;
}

export function SelectedMethodForm({
  method,
  buyerSubmission,
  transferNumber,
  receiptFile,
  isDisabled,
  onBuyerSubmissionChange,
  onTransferNumberChange,
  onReceiptChange,
}: SelectedMethodFormProps) {
  const t = useTranslations("checkout");

  return (
    <>
      <DisplayBlocksSection
        blocks={method.display_blocks}
        label={t("paymentInstructions")}
      />

      {method.form_fields.length > 0 && (
        <FormFieldsSection
          fields={method.form_fields}
          buyerSubmission={buyerSubmission}
          isDisabled={isDisabled}
          label={t("fillForm")}
          onBuyerSubmissionChange={onBuyerSubmissionChange}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold">
          {t("transferNumber")}
          {method.requires_transfer_number && (
            <span className="ml-1 text-destructive">*</span>
          )}
        </label>
        <input
          type="text"
          value={transferNumber}
          onChange={(e) => onTransferNumberChange(e.target.value)}
          placeholder={t("transferNumberHint")}
          disabled={isDisabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-foreground"
        />
      </div>

      <ReceiptUpload
        file={receiptFile}
        onFileChange={onReceiptChange}
        disabled={isDisabled}
        required={method.requires_receipt}
      />
    </>
  );
}
