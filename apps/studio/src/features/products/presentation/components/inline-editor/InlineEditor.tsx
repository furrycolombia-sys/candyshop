"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { tid } from "shared";

import { EditorToolbar } from "./EditorToolbar";
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
}

export function InlineEditor({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit,
}: InlineEditorProps) {
  const t = useTranslations("form.inlineEditor");
  const tValidation = useTranslations("form.validation");

  const schema = useMemo(
    () => createProductFormSchema(tValidation),
    [tValidation],
  );

  const { control, register, setValue, handleSubmit } =
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

      <InlineHero control={control} />

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
