"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { tid } from "shared";

import { EditorToolbar } from "./EditorToolbar";
import { FormErrorBanner } from "./FormErrorBanner";
import { InlineHero } from "./InlineHero";
import { InlineSections } from "./InlineSections";
import { InlineTextField } from "./InlineTextField";

import { PRODUCT_FORM_DEFAULTS } from "@/features/products/domain/constants";
import {
  createProductFormSchema,
  type ProductFormValues,
} from "@/features/products/domain/validationSchema";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";

interface InlineEditorProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  isSubmitting: boolean;
  isEdit: boolean;
  /** API/mutation error to display */
  mutationError?: Error | null;
}

export function InlineEditor({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit,
  mutationError,
}: InlineEditorProps) {
  const t = useTranslations("form.inlineEditor");
  const tValidation = useTranslations("form.validation");

  const schema = useMemo(
    () => createProductFormSchema(tValidation),
    [tValidation],
  );

  const { control, register, setValue, handleSubmit, formState } =
    useForm<ProductFormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver inference mismatch with optional Zod defaults
      resolver: zodResolver(schema) as any,
      defaultValues: { ...PRODUCT_FORM_DEFAULTS, ...defaultValues },
    });

  const category = useWatch({ control, name: "category" });
  const theme = getCategoryTheme(category);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-screen flex-col"
      {...tid("inline-editor")}
    >
      <EditorToolbar
        control={control}
        register={register}
        setValue={setValue}
        onSave={handleSubmit(onSubmit)}
        isSaving={isSubmitting}
        isEdit={isEdit}
      />

      <FormErrorBanner key={formState.submitCount} errors={formState.errors} />

      {mutationError && (
        <div
          className="sticky top-[61px] z-30 border-b border-destructive/30 bg-destructive/8 px-4 py-2.5 backdrop-blur-xl backdrop-saturate-150"
          role="alert"
          {...tid("mutation-error-banner")}
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <span className="font-mono text-xs text-destructive">
              {mutationError.message}
            </span>
          </div>
        </div>
      )}

      <InlineHero control={control} errors={formState.errors} />

      {/* Long description between hero and highlights */}
      <section className="w-full">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <InlineTextField
            control={control}
            fieldNameEn="long_description_en"
            fieldNameEs="long_description_es"
            placeholder={t("longDescriptionPlaceholder")}
            as="textarea"
            className="text-sm/relaxed text-muted-foreground"
          />
        </div>
      </section>

      <InlineSections control={control} theme={theme} />
    </form>
  );
}
