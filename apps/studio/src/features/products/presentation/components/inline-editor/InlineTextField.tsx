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
      {/* Language pill — matches section editor siblings */}
      <button
        type="button"
        onClick={toggleLang}
        className="absolute -top-3 right-0 z-10 rounded-sm border-2 border-foreground/30 bg-background px-1.5 py-0.5 font-display text-tiny font-extrabold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        {...tid(`lang-toggle-${fieldNameEn}`)}
      >
        {lang.toUpperCase()}
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
