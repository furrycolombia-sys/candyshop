"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { tid } from "shared";

import { InlineImageCarousel } from "./InlineImageCarousel";
import { InlinePriceFields } from "./InlinePriceFields";
import { InlineTagEditor } from "./InlineTagEditor";
import { InlineTextField } from "./InlineTextField";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import {
  CATEGORY_HERO_BG,
  getCategoryTheme,
} from "@/shared/domain/categoryConstants";

interface InlineHeroProps {
  control: Control<ProductFormValues>;
}

export function InlineHero({ control }: InlineHeroProps) {
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
  const heroBg = CATEGORY_HERO_BG[category] ?? "bg-muted";

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

  return (
    <section
      className={`w-full ${heroBg} border-b-[3px] border-foreground`}
      {...tid("inline-hero")}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* Left: Image Carousel */}
          <InlineImageCarousel control={control} />

          {/* Right: Product Info */}
          <div className="flex flex-col flex-1 gap-4 min-w-0">
            {/* 1. Tagline — theme-colored */}
            <InlineTextField
              control={control}
              fieldNameEn="tagline_en"
              fieldNameEs="tagline_es"
              placeholder={t("taglinePlaceholder")}
              className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.text}`}
            />

            {/* 2. Name */}
            <InlineTextField
              control={control}
              fieldNameEn="name_en"
              fieldNameEs="name_es"
              placeholder={t("namePlaceholder")}
              className="font-display text-4xl/tight lg:text-5xl/tight font-extrabold uppercase"
            />

            {/* 3. Badges row — category, type, stock status */}
            <div
              className="flex items-center gap-2 flex-wrap"
              {...tid("hero-badges")}
            >
              {/* Category badge — theme bg */}
              <span
                className={`${theme.badgeBg} border-[3px] border-foreground px-3 py-1 text-xs font-bold text-foreground`}
                {...tid("hero-category")}
              >
                {tCategories(category)}
              </span>

              {/* Type badge */}
              <span
                className="bg-background border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                {...tid("hero-type")}
              >
                {tTypes(type)}
              </span>

              {/* Stock badge */}
              {isAvailable ? (
                <span className="bg-(--mint) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("inStock")}
                </span>
              ) : (
                <span className="bg-(--peach) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("outOfStock")}
                </span>
              )}

              {/* Refundable badge */}
              {refundable === true && (
                <span className="bg-(--mint) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("refundable")}
                </span>
              )}
              {refundable === false && (
                <span className="bg-(--peach) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("nonRefundable")}
                </span>
              )}
            </div>

            {/* 4. Price block — bordered card matching store PriceBlock */}
            <InlinePriceFields control={control} />

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
