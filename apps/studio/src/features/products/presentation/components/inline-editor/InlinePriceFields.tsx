"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import { PriceInput } from "./PriceInput";

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
          <PriceInput
            inputRef={copField.ref}
            value={copField.value}
            onChange={(v) => copField.onChange(v === "" ? 0 : Number(v))}
            onBlur={copField.onBlur}
            placeholder="0"
            className="font-display text-5xl font-extrabold"
            testId="inline-price-cop"
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
          <PriceInput
            inputRef={usdField.ref}
            value={usdField.value ?? null}
            onChange={(v) => usdField.onChange(v === "" ? 0 : Number(v))}
            onBlur={usdField.onBlur}
            placeholder="0"
            className="font-display text-2xl font-bold text-muted-foreground"
            testId="inline-price-usd"
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
          <PriceInput
            inputRef={compareCopField.ref}
            value={compareCopField.value}
            onChange={(v) =>
              compareCopField.onChange(v === "" ? null : Number(v))
            }
            onBlur={compareCopField.onBlur}
            placeholder="—"
            className="font-display text-lg font-bold text-muted-foreground line-through"
            testId="inline-compare-price-cop"
          />
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("comparePriceUsd")}
          </span>
          <span className="font-display text-lg font-bold text-muted-foreground line-through">
            $
          </span>
          <PriceInput
            inputRef={compareUsdField.ref}
            value={compareUsdField.value}
            onChange={(v) =>
              compareUsdField.onChange(v === "" ? null : Number(v))
            }
            onBlur={compareUsdField.onBlur}
            placeholder="—"
            className="font-display text-lg font-bold text-muted-foreground line-through"
            testId="inline-compare-price-usd"
          />
        </div>
      </div>
    </div>
  );
}
