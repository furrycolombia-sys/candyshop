/* eslint-disable i18next/no-literal-string -- language code labels (EN/ES) are UI chrome, not user-facing content */
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { DisplaySectionEditor } from "./DisplaySectionEditor";
import { FormSectionEditor } from "./FormSectionEditor";

import { useSavePaymentMethod } from "@/features/payment-methods/application/hooks/useSavePaymentMethod";
import type {
  DisplayBlock,
  FormField,
  SellerPaymentMethod,
} from "@/features/payment-methods/domain/types";

interface PaymentMethodEditorProps {
  method: SellerPaymentMethod;
}

export function PaymentMethodEditor({ method }: PaymentMethodEditorProps) {
  const t = useTranslations("paymentMethods");

  const [nameEn, setNameEn] = useState(method.name_en);
  const [nameEs, setNameEs] = useState(method.name_es ?? "");
  const [displayBlocks, setDisplayBlocks] = useState<DisplayBlock[]>(
    method.display_blocks ?? [],
  );
  const [formFields, setFormFields] = useState<FormField[]>(
    method.form_fields ?? [],
  );
  const [requiresReceipt, setRequiresReceipt] = useState(
    method.requires_receipt,
  );
  const [requiresTransferNumber, setRequiresTransferNumber] = useState(
    method.requires_transfer_number,
  );

  const nameEnError = nameEn.trim() ? null : t("nameRequired");

  const { isDirty, isPending, savedRecently, save } = useSavePaymentMethod({
    paymentMethodId: method.id,
    initial: method,
    nameEn,
    nameEs,
    displayBlocks,
    formFields,
    requiresReceipt,
    requiresTransferNumber,
  });

  const canSave = isDirty && !nameEnError && !isPending;

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* Name fields — 2-column grid on wider screens */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="payment-method-name-en-input"
            className="font-display text-xs font-bold uppercase tracking-wider"
          >
            Name (EN) *
          </label>
          <input
            id="payment-method-name-en-input"
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="flex h-10 w-full border-strong border-foreground bg-background px-3 py-2 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand"
            {...tid("payment-method-name-en")}
          />
          {nameEnError && (
            <p className="text-sm text-destructive">{nameEnError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="payment-method-name-es-input"
            className="font-display text-xs font-bold uppercase tracking-wider"
          >
            Name (ES) —{" "}
            <span className="font-normal normal-case text-muted-foreground">
              {t("optional")}
            </span>
          </label>
          <input
            id="payment-method-name-es-input"
            type="text"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            className="flex h-10 w-full border-strong border-foreground bg-background px-3 py-2 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand"
            {...tid("payment-method-name-es")}
          />
        </div>
      </div>

      {/* Buyer proof toggles */}
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={requiresReceipt}
            onChange={(e) => setRequiresReceipt(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-foreground"
            {...tid("payment-method-requires-receipt")}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-xs font-bold uppercase tracking-wider">
              {t("requiresReceipt")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("requiresReceiptHint")}
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={requiresTransferNumber}
            onChange={(e) => setRequiresTransferNumber(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-foreground"
            {...tid("payment-method-requires-transfer-number")}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-xs font-bold uppercase tracking-wider">
              {t("requiresTransferNumber")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("requiresTransferNumberHint")}
            </span>
          </div>
        </label>
      </div>

      {/* Display Section */}
      <DisplaySectionEditor
        blocks={displayBlocks}
        onChange={setDisplayBlocks}
      />

      {/* Form Section */}
      <FormSectionEditor fields={formFields} onChange={setFormFields} />

      {/* Save button */}
      <div className="flex items-center gap-3 border-t border-foreground pt-4">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="border-strong border-foreground bg-foreground px-4 py-2 text-sm font-bold text-background shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
          {...tid("payment-method-save")}
        >
          {isPending ? t("saving") : t("save")}
        </button>
        {savedRecently && !isDirty && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <span className="size-2 rounded-full bg-success" />
            {t("saved")}
          </span>
        )}
      </div>
    </div>
  );
}
