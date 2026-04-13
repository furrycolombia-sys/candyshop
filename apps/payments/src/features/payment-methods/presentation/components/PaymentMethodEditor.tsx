/* eslint-disable i18next/no-literal-string -- language code labels (EN/ES) are UI chrome, not user-facing content */
"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { tid } from "shared";

import { DisplaySectionEditor } from "./DisplaySectionEditor";
import { FormSectionEditor } from "./FormSectionEditor";

import { useUpdatePaymentMethod } from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import type {
  DisplayBlock,
  FormField,
  SellerPaymentMethod,
} from "@/features/payment-methods/domain/types";

const DEBOUNCE_MS = 500;

interface PaymentMethodEditorProps {
  method: SellerPaymentMethod;
  onClose?: () => void;
}

export function PaymentMethodEditor({ method }: PaymentMethodEditorProps) {
  const t = useTranslations("paymentMethods");
  const updateMutation = useUpdatePaymentMethod();

  const [nameEn, setNameEn] = useState(method.name_en);
  const [nameEs, setNameEs] = useState(method.name_es ?? "");
  const [displayBlocks, setDisplayBlocks] = useState<DisplayBlock[]>(
    method.display_blocks ?? [],
  );
  const [formFields, setFormFields] = useState<FormField[]>(
    method.form_fields ?? [],
  );
  const [nameEnError, setNameEnError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (patch: Parameters<typeof updateMutation.mutate>[0]["patch"]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus("saving");
      debounceRef.current = setTimeout(() => {
        updateMutation.mutate(
          { id: method.id, patch },
          {
            onSuccess: () => setSaveStatus("saved"),
            onError: () => setSaveStatus("idle"),
          },
        );
      }, DEBOUNCE_MS);
    },
    [method.id, updateMutation],
  );

  // Auto-save name changes
  useEffect(() => {
    if (!nameEn.trim()) {
      setNameEnError(t("nameRequired"));
      return;
    }
    setNameEnError(null);
    triggerSave({ name_en: nameEn, name_es: nameEs || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on name changes
  }, [nameEn, nameEs]);

  // Auto-save display blocks
  useEffect(() => {
    triggerSave({ display_blocks: displayBlocks });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on block changes
  }, [displayBlocks]);

  // Auto-save form fields
  useEffect(() => {
    triggerSave({ form_fields: formFields });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only trigger on field changes
  }, [formFields]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 rounded-xl border-strong border-border bg-background p-6 shadow-brutal-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
          {t("editMethod")}
        </h2>
        {saveStatus === "saving" && (
          <span className="text-xs text-muted-foreground">{t("saving")}</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-success">{t("saved")}</span>
        )}
      </div>

      {/* Name EN */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="payment-method-name-en-input"
          className="text-sm font-semibold"
        >
          Name (EN) *
        </label>
        <input
          id="payment-method-name-en-input"
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...tid("payment-method-name-en")}
        />
        {nameEnError && (
          <p className="text-sm text-destructive">{nameEnError}</p>
        )}
      </div>

      {/* Name ES */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="payment-method-name-es-input"
          className="text-sm font-semibold"
        >
          Name (ES)
        </label>
        <input
          id="payment-method-name-es-input"
          type="text"
          value={nameEs}
          onChange={(e) => setNameEs(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...tid("payment-method-name-es")}
        />
      </div>

      {/* Display Section */}
      <div className="rounded-lg border border-border p-4">
        <DisplaySectionEditor
          blocks={displayBlocks}
          onChange={setDisplayBlocks}
        />
      </div>

      {/* Form Section */}
      <div className="rounded-lg border border-border p-4">
        <FormSectionEditor fields={formFields} onChange={setFormFields} />
      </div>
    </div>
  );
}
