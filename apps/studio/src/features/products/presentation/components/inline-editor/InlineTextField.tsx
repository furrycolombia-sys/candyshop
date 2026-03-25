"use client";

import type { Control, FieldPath } from "react-hook-form";
import { tid } from "shared";

import { LangTextarea } from "./LangTextarea";

import { useLangToggle } from "@/features/products/application/useLangToggle";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlineTextFieldProps {
  control: Control<ProductFormValues>;
  fieldNameEn: FieldPath<ProductFormValues>;
  fieldNameEs: FieldPath<ProductFormValues>;
  placeholder: string;
  placeholderEs?: string;
  as?: "input" | "textarea";
  className?: string;
}

export function InlineTextField({
  control,
  fieldNameEn,
  fieldNameEs,
  placeholder,
  placeholderEs,
  as = "input",
  className = "",
}: InlineTextFieldProps) {
  const { lang, toggleLang } = useLangToggle();
  const isMultiline = as === "textarea";

  return (
    <div className="group relative" {...tid(`inline-text-${fieldNameEn}`)}>
      {/* Language toggle pill */}
      <button
        type="button"
        onClick={toggleLang}
        className="absolute -top-2.5 left-0 z-10 rounded-full border-2 border-foreground bg-background px-1.5 py-px font-display text-[9px] font-extrabold uppercase tracking-widest opacity-60 transition-opacity hover:opacity-100 group-focus-within:opacity-100"
        {...tid(`lang-toggle-${fieldNameEn}`)}
      >
        {lang}
      </button>

      {/* Both textareas always mounted — show/hide via CSS */}
      <LangTextarea
        control={control}
        fieldName={fieldNameEn}
        placeholder={placeholder}
        isMultiline={isMultiline}
        className={className}
        visible={lang === "en"}
        testId={`inline-text-en-${fieldNameEn}`}
      />
      <LangTextarea
        control={control}
        fieldName={fieldNameEs}
        placeholder={placeholderEs ?? placeholder}
        isMultiline={isMultiline}
        className={className}
        visible={lang === "es"}
        testId={`inline-text-es-${fieldNameEs}`}
      />
    </div>
  );
}
