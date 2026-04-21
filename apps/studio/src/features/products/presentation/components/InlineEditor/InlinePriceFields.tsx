"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { POPULAR_CURRENCIES, tid } from "shared";

import { PriceInput } from "./PriceInput";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

/** Parse price input: empty string returns fallback, otherwise converts to number */
function parsePrice(value: string, fallback: number | null): number | null {
  return value === "" ? fallback : Number(value);
}

interface InlinePriceFieldsProps {
  control: Control<ProductFormValues>;
}

export function InlinePriceFields({ control }: InlinePriceFieldsProps) {
  const t = useTranslations("form.inlineEditor");

  const { field: priceField } = useController({ control, name: "price" });
  const { field: currencyField } = useController({ control, name: "currency" });
  const { field: compareField } = useController({
    control,
    name: "compare_at_price",
  });

  return (
    <div
      className="border-strong border-foreground bg-background p-4 shadow-brutal-sm"
      {...tid("inline-price-fields")}
    >
      {/* Currency selector + price */}
      <div className="flex items-baseline gap-4 flex-wrap">
        {/* Currency */}
        <div className="flex flex-col gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("currency")}
          </span>
          <select
            ref={currencyField.ref}
            value={currencyField.value}
            onChange={(e) => currencyField.onChange(e.target.value)}
            onBlur={currencyField.onBlur}
            className="border-strong border-foreground bg-background font-display text-sm font-bold px-2 py-1"
            {...tid("inline-currency")}
          >
            {POPULAR_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("price")}
          </span>
          <PriceInput
            inputRef={priceField.ref}
            value={priceField.value}
            onChange={(v) => priceField.onChange(parsePrice(v, 0))}
            onBlur={priceField.onBlur}
            placeholder="0"
            className="font-display text-5xl font-extrabold"
            testId="inline-price"
          />
        </div>
      </div>

      {/* Compare-at price */}
      <div className="mt-3 flex items-baseline gap-4 flex-wrap">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("comparePrice")}
          </span>
          <span className="font-display text-lg font-bold text-muted-foreground line-through">
            {currencyField.value}
          </span>
          <PriceInput
            inputRef={compareField.ref}
            value={compareField.value}
            onChange={(v) => compareField.onChange(parsePrice(v, null))}
            onBlur={compareField.onBlur}
            placeholder="—"
            className="font-display text-lg font-bold text-muted-foreground line-through"
            testId="inline-compare-price"
          />
        </div>
      </div>
    </div>
  );
}
