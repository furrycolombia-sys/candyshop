"use client";

import { DynamicFormField } from "./DynamicFormField";

import type { FormField } from "@/shared/domain/PaymentMethodTypes";

interface FormFieldsSectionProps {
  fields: FormField[];
  buyerSubmission: Record<string, string>;
  isDisabled: boolean;
  label: string;
  onBuyerSubmissionChange: (fieldId: string, value: string) => void;
}

export function FormFieldsSection({
  fields,
  buyerSubmission,
  isDisabled,
  label,
  onBuyerSubmissionChange,
}: FormFieldsSectionProps) {
  if (fields.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="font-display text-xs font-extrabold uppercase tracking-widest">
        {label}
      </p>
      <div className="space-y-4">
        {fields.map((field: FormField) => (
          <DynamicFormField
            key={field.id}
            field={field}
            value={buyerSubmission[field.id] ?? ""}
            onChange={(value) => onBuyerSubmissionChange(field.id, value)}
            disabled={isDisabled}
          />
        ))}
      </div>
    </div>
  );
}
