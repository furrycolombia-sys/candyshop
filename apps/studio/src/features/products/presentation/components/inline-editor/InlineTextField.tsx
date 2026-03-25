"use client";

import { useCallback, useState } from "react";
import type { Control, FieldPath } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

type Lang = "en" | "es";

interface InlineTextFieldProps {
  control: Control<ProductFormValues>;
  fieldNameEn: FieldPath<ProductFormValues>;
  fieldNameEs: FieldPath<ProductFormValues>;
  placeholder: string;
  as?: "input" | "textarea";
  className?: string;
}

export function InlineTextField({
  control,
  fieldNameEn,
  fieldNameEs,
  placeholder,
  as = "input",
  className = "",
}: InlineTextFieldProps) {
  const [lang, setLang] = useState<Lang>("en");

  const activeField = lang === "en" ? fieldNameEn : fieldNameEs;

  const { field } = useController({
    control,
    name: activeField,
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  const value = (field.value as string) ?? "";
  const isEmpty = value.length === 0;

  const baseClasses = `w-full bg-transparent outline-none placeholder:text-muted-foreground/50 transition-colors ${
    isEmpty
      ? "border-b-2 border-dashed border-foreground/20"
      : "border-b-2 border-transparent"
  } focus:border-b-2 focus:border-solid focus:border-foreground/40 ${className}`;

  // Destructure field to avoid react-hooks/refs lint errors with react-hook-form
  const { ref, name, onChange, onBlur } = field;

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

      {as === "textarea" ? (
        <textarea
          ref={ref}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={3}
          className={`${baseClasses} resize-none`}
        />
      ) : (
        <input
          ref={ref}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={baseClasses}
        />
      )}
    </div>
  );
}
