"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController, useWatch } from "react-hook-form";
import { tid } from "shared";
import type { ProductCategory } from "shared/types";

import { InlineImageCarousel } from "./InlineImageCarousel";
import { InlinePriceFields } from "./InlinePriceFields";
import { InlineTagEditor } from "./InlineTagEditor";
import { InlineTextField } from "./InlineTextField";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

/** Category → hero background color mapping using candy CSS vars */
const CATEGORY_HERO_BG: Record<ProductCategory, string> = {
  fursuits: "bg-(--pink)/15",
  merch: "bg-(--mint)/15",
  art: "bg-(--lilac)/15",
  events: "bg-(--lemon)/15",
  digital: "bg-(--sky)/15",
  deals: "bg-(--peach)/15",
};

interface InlineHeroProps {
  control: Control<ProductFormValues>;
}

export function InlineHero({ control }: InlineHeroProps) {
  const t = useTranslations("form.inlineEditor");

  const category = useWatch({ control, name: "category" });
  const heroBg = CATEGORY_HERO_BG[category] ?? "bg-muted";

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
      className={`w-full border-b-3 border-foreground ${heroBg}`}
      {...tid("inline-hero")}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-10">
          {/* Left: Image Carousel */}
          <InlineImageCarousel control={control} />

          {/* Right: Product Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Tagline */}
            <InlineTextField
              control={control}
              fieldNameEn="tagline_en"
              fieldNameEs="tagline_es"
              placeholder={t("taglinePlaceholder")}
              className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/70"
            />

            {/* Name */}
            <InlineTextField
              control={control}
              fieldNameEn="name_en"
              fieldNameEs="name_es"
              placeholder={t("namePlaceholder")}
              className="font-display text-4xl/tight font-extrabold uppercase lg:text-5xl/tight"
            />

            {/* Short Description */}
            <InlineTextField
              control={control}
              fieldNameEn="description_en"
              fieldNameEs="description_es"
              placeholder={t("descriptionPlaceholder")}
              as="textarea"
              className="max-w-prose text-sm/relaxed text-muted-foreground"
            />

            {/* Price */}
            <InlinePriceFields control={control} />

            {/* Stock */}
            <div
              className="rounded-xl border-3 border-foreground bg-card p-4 nb-shadow-sm"
              {...tid("inline-stock-fields")}
            >
              <div className="flex flex-col gap-3">
                <span className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {t("stock.label")}
                </span>

                {/* Unlimited toggle */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => handleUnlimitedToggle(e.target.checked)}
                    className="size-4 cursor-pointer accent-foreground"
                    {...tid("inline-stock-unlimited")}
                  />
                  <span className="font-display text-sm font-bold uppercase tracking-wider">
                    {t("stock.unlimited")}
                  </span>
                </label>

                {/* Quantity input — visible when not unlimited */}
                {!isUnlimited && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
                      className="w-24 bg-transparent font-display text-2xl font-extrabold outline-none placeholder:text-muted-foreground/30"
                      {...tid("inline-stock-quantity")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <InlineTagEditor control={control} />
          </div>
        </div>
      </div>
    </section>
  );
}
