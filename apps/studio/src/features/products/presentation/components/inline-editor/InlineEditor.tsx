"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { tid } from "shared";

import { EditorToolbar } from "./EditorToolbar";
import { InlineFaq } from "./InlineFaq";
import { InlineHero } from "./InlineHero";
import { InlineHighlights } from "./InlineHighlights";
import { InlineTextField } from "./InlineTextField";
import { InlineTypeDetails } from "./InlineTypeDetails";

import {
  productFormSchema,
  type ProductFormValues,
} from "@/features/products/domain/validationSchema";

interface InlineEditorProps {
  defaultValues?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  isSubmitting: boolean;
  isEdit: boolean;
}

const FORM_DEFAULTS: ProductFormValues = {
  name_en: "",
  name_es: "",
  description_en: "",
  description_es: "",
  tagline_en: "",
  tagline_es: "",
  long_description_en: "",
  long_description_es: "",
  type: "merch",
  category: "merch",
  price_cop: 0,
  price_usd: "",
  tags: "",
  featured: false,
  images: [],
  highlights: [],
  faq: [],
};

export function InlineEditor({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit,
}: InlineEditorProps) {
  const t = useTranslations("form.inlineEditor");

  const { control, register, setValue, handleSubmit } =
    useForm<ProductFormValues>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver inference mismatch with optional Zod defaults
      resolver: zodResolver(productFormSchema) as any,
      defaultValues: { ...FORM_DEFAULTS, ...defaultValues },
    });

  const productType = useWatch({ control, name: "type" });

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

      <InlineHighlights control={control} />

      <InlineFaq control={control} />

      <InlineTypeDetails control={control} productType={productType} />
    </form>
  );
}
