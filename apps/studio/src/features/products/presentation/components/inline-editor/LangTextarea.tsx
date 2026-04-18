"use client";

import { useRef } from "react";
import type { Control, FieldPath } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";
import { cn } from "ui";

import { useAutoResize } from "@/features/products/application/hooks/useAutoResize";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";

const MULTILINE_ROWS = 3;

/**
 * Single-language textarea that auto-resizes to fit content.
 * Always mounted — shown/hidden via CSS to preserve form state.
 */
export function LangTextarea({
  control,
  fieldName,
  placeholder,
  isMultiline,
  className,
  visible,
  testId,
}: {
  control: Control<ProductFormValues>;
  fieldName: FieldPath<ProductFormValues>;
  placeholder: string;
  isMultiline: boolean;
  className: string;
  visible: boolean;
  testId: string;
}) {
  const { field } = useController({ control, name: fieldName });
  const { ref: fieldRef, name, value: rawValue, onChange, onBlur } = field;
  const value = (rawValue as string) ?? "";
  const isEmpty = value.length === 0;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoResize = useAutoResize(textareaRef, `${value}|${visible}`);

  const borderClass = isEmpty
    ? "border-b-2 border-dashed border-foreground/20"
    : "border-b-2 border-transparent";

  return (
    <textarea
      ref={(el) => {
        fieldRef(el);
        textareaRef.current = el;
      }}
      name={name}
      value={value}
      onChange={(e) => {
        onChange(e);
        autoResize();
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={isMultiline ? MULTILINE_ROWS : 1}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "w-full bg-transparent outline-none placeholder:text-muted-foreground/50 transition-colors focus:border-b-2 focus:border-solid focus:border-foreground/40 resize-none overflow-hidden",
        borderClass,
        className,
        !visible && "absolute inset-0 opacity-0 pointer-events-none",
      )}
      {...tid(testId)}
    />
  );
}
