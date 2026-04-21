"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldErrors } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { tid } from "shared";
import { cn } from "ui";

import { InlineImageCarousel } from "./InlineImageCarousel";
import { InlinePriceFields } from "./InlinePriceFields";
import { InlineTagEditor } from "./InlineTagEditor";
import { InlineTextField } from "./InlineTextField";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";

interface InlineHeroProps {
  control: Control<ProductFormValues>;
  errors?: FieldErrors<ProductFormValues>;
}

export function InlineHero({ control, errors }: InlineHeroProps) {
  const t = useTranslations("form.inlineEditor");
  const tProducts = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");

  const category = useWatch({ control, name: "category" });
  const type = useWatch({ control, name: "type" });
  const maxQuantity = useWatch({ control, name: "max_quantity" });
  const isActive = useWatch({ control, name: "is_active" });
  const refundable = useWatch({ control, name: "refundable" });

  const theme = getCategoryTheme(category);

  // Stock status — mirrors store logic
  const isAvailable = isActive && (maxQuantity === null || maxQuantity > 0);

  // Stock quantity controller for inline editing
  const { field: maxQtyField } = useController({
    control,
    name: "max_quantity",
  });
  const {
    ref: maxQtyRef,
    value: maxQtyValue,
    onChange: maxQtyOnChange,
    onBlur: maxQtyOnBlur,
  } = maxQtyField;
  const isUnlimited = maxQtyValue === null;

  function handleUnlimitedToggle(checked: boolean) {
    maxQtyOnChange(checked ? null : 0);
  }

  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    maxQtyOnChange(raw === "" ? null : Number.parseInt(raw, 10));
  }

  const badgeBase =
    "border-strong border-foreground px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-foreground";
  const errorRing =
    "rounded-md ring-2 ring-destructive ring-offset-2 ring-offset-transparent";

  return (
    <section
      className="w-full border-b-strong border-foreground"
      style={{ backgroundColor: theme.bgLight }}
      {...tid("inline-hero")}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* Left: Image Carousel */}
          <InlineImageCarousel control={control} />

          {/* Right: Product Info */}
          <div className="flex flex-col flex-1 gap-4 min-w-0">
            {/* 1. Tagline — theme-colored */}
            <div style={{ color: theme.text }}>
              <InlineTextField
                control={control}
                fieldNameEn="tagline_en"
                fieldNameEs="tagline_es"
                placeholder={t("taglinePlaceholder")}
                className="text-xs font-bold uppercase tracking-section"
              />
            </div>

            {/* 2. Name */}
            <div className={errors?.name_en ? errorRing : ""}>
              <InlineTextField
                control={control}
                fieldNameEn="name_en"
                fieldNameEs="name_es"
                placeholder={t("namePlaceholder")}
                className="font-display text-4xl/tight lg:text-5xl/tight font-extrabold uppercase"
              />
              {errors?.name_en && (
                <p className="mt-1 font-mono text-xs text-destructive">
                  {errors.name_en.message}
                </p>
              )}
            </div>

            {/* 3. Badges row — category, type, stock status */}
            <div
              className="flex items-center gap-2 flex-wrap"
              {...tid("hero-badges")}
            >
              {/* Category badge — theme bg */}
              <span
                className="border-strong border-foreground px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: theme.badgeBg,
                  color: theme.foreground,
                }}
                {...tid("hero-category")}
              >
                {tCategories(category)}
              </span>

              {/* Type badge */}
              <span
                className={cn("bg-background text-muted-foreground", badgeBase)}
                {...tid("hero-type")}
              >
                {tTypes(type)}
              </span>

              {/* Stock badge */}
              <span
                className={cn(
                  isAvailable
                    ? "bg-success text-success-foreground" // eslint-disable-line sonarjs/no-duplicate-string -- Tailwind classes must remain inline per project rules
                    : "bg-warning text-warning-foreground", // eslint-disable-line sonarjs/no-duplicate-string -- Tailwind classes must remain inline per project rules
                  badgeBase,
                )}
              >
                {isAvailable ? tProducts("inStock") : tProducts("outOfStock")}
              </span>

              {/* Refundable badge */}
              {refundable === true && (
                <span
                  className={cn(
                    "bg-success text-success-foreground",
                    badgeBase,
                  )}
                >
                  {tProducts("refundable")}
                </span>
              )}
              {refundable === false && (
                <span
                  className={cn(
                    "bg-warning text-warning-foreground",
                    badgeBase,
                  )}
                >
                  {tProducts("nonRefundable")}
                </span>
              )}
            </div>

            {/* 4. Price block — bordered card matching store PriceBlock */}
            <div className={errors?.price ? errorRing : ""}>
              <InlinePriceFields control={control} />
              {errors?.price && (
                <p className="mt-1 font-mono text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* 5. Description */}
            <InlineTextField
              control={control}
              fieldNameEn="description_en"
              fieldNameEs="description_es"
              placeholder={t("descriptionPlaceholder")}
              as="textarea"
              className="text-sm/relaxed text-muted-foreground max-w-prose"
            />

            {/* 6. Tags */}
            <InlineTagEditor control={control} />

            {/* 7. Stock quantity — compact inline section */}
            <div
              className="flex items-center gap-3 flex-wrap"
              {...tid("inline-stock-fields")}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => handleUnlimitedToggle(e.target.checked)}
                  className="size-4 cursor-pointer accent-foreground"
                  {...tid("inline-stock-unlimited")}
                />
                <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("stock.unlimited")}
                </span>
              </label>

              {!isUnlimited && (
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("stock.quantity")}
                  </span>
                  <input
                    ref={maxQtyRef}
                    type="number"
                    min={0}
                    value={maxQtyValue ?? ""}
                    onChange={handleQuantityChange}
                    onBlur={maxQtyOnBlur}
                    placeholder="0"
                    className="w-20 bg-transparent font-display text-xl font-extrabold outline-none placeholder:text-muted-foreground/30"
                    {...tid("inline-stock-quantity")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
