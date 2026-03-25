"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlinePriceFieldsProps {
  control: Control<ProductFormValues>;
}

export function InlinePriceFields({ control }: InlinePriceFieldsProps) {
  const t = useTranslations("form.inlineEditor");

  const { field: copField } = useController({ control, name: "price_cop" });
  const { field: usdField } = useController({ control, name: "price_usd" });
  const { field: compareCopField } = useController({
    control,
    name: "compare_at_price_cop",
  });
  const { field: compareUsdField } = useController({
    control,
    name: "compare_at_price_usd",
  });

  const {
    ref: copRef,
    value: copValue,
    onChange: copOnChange,
    onBlur: copOnBlur,
  } = copField;
  const {
    ref: usdRef,
    value: usdValue,
    onChange: usdOnChange,
    onBlur: usdOnBlur,
  } = usdField;
  const {
    ref: compareCopRef,
    value: compareCopValue,
    onChange: compareCopOnChange,
    onBlur: compareCopOnBlur,
  } = compareCopField;
  const {
    ref: compareUsdRef,
    value: compareUsdValue,
    onChange: compareUsdOnChange,
    onBlur: compareUsdOnBlur,
  } = compareUsdField;

  return (
    <div
      className="border-[3px] border-foreground bg-background p-4 nb-shadow-sm"
      {...tid("inline-price-fields")}
    >
      {/* Main prices — big display like store PriceBlock */}
      <div className="flex items-baseline gap-4 flex-wrap">
        {/* COP Price */}
        <div className="flex items-baseline gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("priceCop")}
          </span>
          <span className="font-display text-5xl font-extrabold">$</span>
          <input
            ref={copRef}
            type="number"
            min={0}
            value={copValue ?? ""}
            onChange={copOnChange}
            onBlur={copOnBlur}
            placeholder="0"
            className="w-36 bg-transparent font-display text-5xl font-extrabold outline-none placeholder:text-muted-foreground/30"
            {...tid("inline-price-cop")}
          />
        </div>

        {/* USD Price */}
        <div className="flex items-baseline gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("priceUsd")}
          </span>
          <span className="font-display text-2xl font-bold text-muted-foreground">
            $
          </span>
          <input
            ref={usdRef}
            type="number"
            min={0}
            value={usdValue ?? ""}
            onChange={usdOnChange}
            onBlur={usdOnBlur}
            placeholder="0"
            className="w-24 bg-transparent font-display text-2xl font-bold text-muted-foreground outline-none placeholder:text-muted-foreground/30"
            {...tid("inline-price-usd")}
          />
        </div>
      </div>

      {/* Compare-at prices — strikethrough style */}
      <div className="mt-3 flex items-baseline gap-4 flex-wrap">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("comparePriceCop")}
          </span>
          <span className="font-display text-lg font-bold text-muted-foreground line-through">
            $
          </span>
          <input
            ref={compareCopRef}
            type="number"
            min={0}
            value={compareCopValue ?? ""}
            onChange={compareCopOnChange}
            onBlur={compareCopOnBlur}
            placeholder="—"
            className="w-24 bg-transparent font-display text-lg font-bold text-muted-foreground line-through outline-none placeholder:text-muted-foreground/20 placeholder:no-underline"
            {...tid("inline-compare-price-cop")}
          />
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("comparePriceUsd")}
          </span>
          <span className="font-display text-lg font-bold text-muted-foreground line-through">
            $
          </span>
          <input
            ref={compareUsdRef}
            type="number"
            min={0}
            value={compareUsdValue ?? ""}
            onChange={compareUsdOnChange}
            onBlur={compareUsdOnBlur}
            placeholder="—"
            className="w-24 bg-transparent font-display text-lg font-bold text-muted-foreground line-through outline-none placeholder:text-muted-foreground/20 placeholder:no-underline"
            {...tid("inline-compare-price-usd")}
          />
        </div>
      </div>
    </div>
  );
}
