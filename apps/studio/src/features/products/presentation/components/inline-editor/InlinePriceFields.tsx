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

  // Destructure to avoid react-hooks/refs lint errors
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

  return (
    <div
      className="rounded-xl border-3 border-foreground bg-card p-4 nb-shadow-sm"
      {...tid("inline-price-fields")}
    >
      <div className="flex items-baseline gap-4">
        {/* COP Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("priceCop")}
          </span>
          <span className="font-display text-3xl font-extrabold">$</span>
          <input
            ref={copRef}
            type="number"
            min={0}
            value={copValue ?? ""}
            onChange={copOnChange}
            onBlur={copOnBlur}
            placeholder="0"
            className="w-32 bg-transparent font-display text-3xl font-extrabold outline-none placeholder:text-muted-foreground/30"
            {...tid("inline-price-cop")}
          />
        </div>

        {/* USD Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("priceUsd")}
          </span>
          <span className="font-display text-xl font-bold text-muted-foreground">
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
            className="w-24 bg-transparent font-display text-xl font-bold text-muted-foreground outline-none placeholder:text-muted-foreground/30"
            {...tid("inline-price-usd")}
          />
        </div>
      </div>
    </div>
  );
}
