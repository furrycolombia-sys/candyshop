/* eslint-disable react/no-multi-comp -- FileInput is a private helper co-located with its parent */
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { i18nField, tid } from "shared";
import { cn } from "ui";

import type { FormField } from "@/shared/domain/PaymentMethodTypes";
import { validateFileSize } from "@/shared/domain/paymentMethodUtils";

interface DynamicFormFieldProps {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
}

export function DynamicFormField({
  field,
  value,
  onChange,
  onFileChange,
  disabled = false,
  error,
}: DynamicFormFieldProps) {
  const locale = useLocale();
  const inputId = useId();
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  const label = i18nField(field, "label", locale) || field.label_en;
  const placeholder = i18nField(field, "placeholder", locale) || "";

  const baseInputClass =
    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-foreground";

  function renderInput() {
    if (field.type === "textarea") {
      return (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={cn(baseInputClass, "resize-y")}
        />
      );
    }
    if (field.type === "file") {
      return (
        <FileInput
          id={inputId}
          disabled={disabled}
          onFileChange={onFileChange}
          onChange={onChange}
          onFileSizeError={setFileSizeError}
        />
      );
    }
    return (
      <input
        id={inputId}
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(baseInputClass, "h-10")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1" {...tid(`dynamic-field-${field.id}`)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>

      {renderInput()}

      {fileSizeError && (
        <p className="text-xs text-destructive">{fileSizeError}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── File Input ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 10 MB in bytes
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function FileInput({
  id,
  disabled,
  onFileChange,
  onChange,
  onFileSizeError,
}: {
  id: string;
  disabled: boolean;
  onFileChange?: (file: File | null) => void;
  onChange: (value: string) => void;
  onFileSizeError?: (message: string | null) => void;
}) {
  const t = useTranslations("checkout");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      onFileChange?.(null);
      onChange("");
      onFileSizeError?.(null);
      return;
    }
    if (!validateFileSize(file.size)) {
      e.target.value = "";
      onFileChange?.(null);
      onChange("");
      onFileSizeError?.(
        t("fileSizeExceeded", {
          multiplier: (file.size / MAX_FILE_BYTES).toFixed(1),
        }),
      );
      return;
    }
    onFileSizeError?.(null);
    onFileChange?.(file);
    onChange(file.name);
  };

  return (
    <input
      id={id}
      type="file"
      accept="image/*,.pdf"
      disabled={disabled}
      onChange={handleChange}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
