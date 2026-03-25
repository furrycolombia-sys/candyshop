"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Package, FileDigit, Wrench, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { tid } from "shared";
import type { ProductType } from "shared/types";
import { Button, Input, Switch, Textarea } from "ui";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
} from "@/features/products/domain/constants";
import {
  productFormSchema,
  type ProductFormValues,
} from "@/features/products/domain/validationSchema";
import { ImageUrlManager } from "@/features/products/presentation/components/ImageUrlManager";
import { TypeFieldsDigital } from "@/features/products/presentation/components/TypeFieldsDigital";
import { TypeFieldsMerch } from "@/features/products/presentation/components/TypeFieldsMerch";
import { TypeFieldsService } from "@/features/products/presentation/components/TypeFieldsService";
import { TypeFieldsTicket } from "@/features/products/presentation/components/TypeFieldsTicket";
import { Link } from "@/shared/infrastructure/i18n";

const TYPE_ICONS: Record<ProductType, typeof Package> = {
  merch: Package,
  digital: FileDigit,
  service: Wrench,
  ticket: Ticket,
};

interface ProductFormProps {
  defaultValues?: ProductFormValues;
  onSubmit: (values: ProductFormValues) => void;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  isEdit,
}: ProductFormProps) {
  const t = useTranslations();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod coerce types don't match react-hook-form inference exactly
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: defaultValues ?? {
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
    },
  });

  /* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() required for dynamic form sections */
  const selectedType = watch("type");
  const featured = watch("featured");
  /* eslint-enable react-hooks/incompatible-library */

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
      {...tid("product-form")}
    >
      {/* ─── Type Selector ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.productType")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRODUCT_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setValue("type", type)}
                className={`flex flex-col items-center gap-2 rounded-lg border-3 p-4 font-display text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? "border-brand bg-brand/10 text-brand nb-shadow-sm"
                    : "border-foreground/20 hover:border-foreground/40"
                }`}
                {...tid(`type-selector-${type}`)}
              >
                <Icon className="size-6" />
                {t(`productTypes.${type}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Basic Info ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.basicInfo")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.nameEn")} *
            </label>
            <Input
              {...register("name_en")}
              aria-invalid={!!errors.name_en}
              {...tid("input-name-en")}
            />
            {errors.name_en && (
              <span className="text-xs text-destructive">
                {t("form.validation.required")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.nameEs")}
            </label>
            <Input {...register("name_es")} {...tid("input-name-es")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.descriptionEn")}
            </label>
            <Textarea
              rows={3}
              {...register("description_en")}
              {...tid("input-description-en")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.descriptionEs")}
            </label>
            <Textarea
              rows={3}
              {...register("description_es")}
              {...tid("input-description-es")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.taglineEn")}
            </label>
            <Input {...register("tagline_en")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.taglineEs")}
            </label>
            <Input {...register("tagline_es")} />
          </div>
        </div>
      </section>

      {/* ─── Long Descriptions ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.longDescription")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.longDescriptionEn")}
            </label>
            <Textarea rows={5} {...register("long_description_en")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.longDescriptionEs")}
            </label>
            <Textarea rows={5} {...register("long_description_es")} />
          </div>
        </div>
      </section>

      {/* ─── Category & Pricing ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.pricing")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.category")} *
            </label>
            <select
              className="h-8 w-full rounded-md border-0 bg-input px-3 text-xs shadow-xs outline-none ring-0 focus-visible:ring-1 focus-visible:ring-border"
              {...register("category")}
              {...tid("select-category")}
            >
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>
          <div /> {/* spacer */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.priceCop")} *
            </label>
            <Input
              type="number"
              min={1}
              {...register("price_cop")}
              aria-invalid={!!errors.price_cop}
              {...tid("input-price-cop")}
            />
            {errors.price_cop && (
              <span className="text-xs text-destructive">
                {t("form.validation.positiveNumber")}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {t("form.fields.priceUsd")}
            </label>
            <Input
              type="number"
              min={1}
              {...register("price_usd")}
              {...tid("input-price-usd")}
            />
          </div>
        </div>
      </section>

      {/* ─── Tags & Featured ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.metadata")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">
              {t("form.fields.tags")}
            </label>
            <Input
              placeholder={t("form.fields.tagsPlaceholder")}
              {...register("tags")}
              {...tid("input-tags")}
            />
            <span className="text-xs text-muted-foreground">
              {t("form.fields.tagsHint")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={featured}
              onCheckedChange={(checked) => setValue("featured", !!checked)}
              {...tid("switch-featured")}
            />
            <label className="text-sm font-medium">
              {t("products.featured")}
            </label>
          </div>
        </div>
      </section>

      {/* ─── Type-Specific Details ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.typeDetails")} — {t(`productTypes.${selectedType}`)}
        </h2>
        {selectedType === "merch" && <TypeFieldsMerch register={register} />}
        {selectedType === "digital" && (
          <TypeFieldsDigital register={register} />
        )}
        {selectedType === "service" && (
          <TypeFieldsService
            register={register}
            watch={watch}
            setValue={setValue}
          />
        )}
        {selectedType === "ticket" && <TypeFieldsTicket register={register} />}
      </section>

      {/* ─── Images ─── */}
      <section className="rounded-xl border-3 border-foreground bg-card p-5 nb-shadow-sm">
        <h2 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider">
          {t("form.sections.images")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {t("form.images.hint")}
        </p>
        <ImageUrlManager control={control} />
      </section>

      {/* ─── Actions ─── */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <Link href="/">
          <Button
            type="button"
            variant="outline"
            className="nb-btn gap-2 rounded-lg border-3 border-foreground px-5 py-2.5"
          >
            <ArrowLeft className="size-4" />
            {t("common.cancel")}
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="nb-btn nb-shadow-md nb-btn-press-sm rounded-xl border-3 bg-brand px-8 py-3 text-brand-foreground hover:bg-brand-hover"
          {...tid("submit-product")}
        >
          {isSubmitting && t("common.loading")}
          {!isSubmitting && isEdit && t("form.actions.save")}
          {!isSubmitting && !isEdit && t("form.actions.create")}
        </Button>
      </div>
    </form>
  );
}
