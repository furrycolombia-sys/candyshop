"use client";

import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { tid } from "shared";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface FormErrorBannerProps {
  errors: FieldErrors<ProductFormValues>;
}

/** Extract top-level error messages from react-hook-form errors */
function getErrorMessages(
  errors: FieldErrors<ProductFormValues>,
): { field: string; message: string }[] {
  const result: { field: string; message: string }[] = [];

  for (const [key, error] of Object.entries(errors)) {
    if (!error) continue;

    if (typeof error.message === "string") {
      result.push({ field: key, message: error.message });
    } else if (
      "root" in error &&
      error.root &&
      typeof error.root === "object" &&
      "message" in error.root &&
      typeof error.root.message === "string"
    ) {
      result.push({ field: key, message: error.root.message });
    }
  }

  return result;
}

export function FormErrorBanner({ errors }: FormErrorBannerProps) {
  const t = useTranslations("form.inlineEditor.errors");
  const [isDismissed, setIsDismissed] = useState(false);

  const errorList = getErrorMessages(errors);
  const errorCount = errorList.length;

  // Nothing to show
  if (errorCount === 0 || isDismissed) return null;

  const handleScrollToField = (fieldKey: string) => {
    // Use getElementsByName (semantic DOM API for form fields) instead of querySelector
    const el = document.getElementsByName(fieldKey)[0];

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  return (
    <div
      className="top-app-toolbar sticky z-30 border-b border-destructive/30 bg-destructive/8 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150 animate-in slide-in-from-top-2 fade-in duration-200"
      role="alert"
      {...tid("form-error-banner")}
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />

        <div className="flex flex-1 flex-col gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-destructive">
            {t("title", { count: errorCount })}
          </span>

          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {errorList.map(({ field, message }) => (
              <li key={field}>
                <button
                  type="button"
                  onClick={() => handleScrollToField(field)}
                  className="font-mono text-xs text-destructive/80 underline decoration-dotted underline-offset-2 transition-colors hover:text-destructive"
                >
                  {message}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="shrink-0 p-0.5 text-destructive/60 transition-colors hover:text-destructive"
          aria-label={t("dismiss")}
          {...tid("form-error-dismiss")}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
