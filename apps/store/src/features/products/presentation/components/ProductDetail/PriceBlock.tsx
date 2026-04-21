import { formatPrice, tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface PriceBlockProps {
  product: Product;
  discountLabel: (values: { amount: string }) => string;
}

export function PriceBlock({ product, discountLabel }: PriceBlockProps) {
  const { price, currency, compare_at_price } = product;
  const hasDiscount = compare_at_price != null && compare_at_price > price;

  return (
    <div
      className="border-strong border-foreground bg-background p-4 shadow-brutal-sm"
      {...tid("hero-price")}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="min-w-0 break-all font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            {formatPrice(price, currency)}
          </span>
        </div>
        {hasDiscount && compare_at_price != null && (
          <span className="font-display text-xl font-bold line-through text-muted-foreground sm:text-2xl">
            {formatPrice(compare_at_price, currency)}
          </span>
        )}
      </div>
      {hasDiscount && compare_at_price != null && (
        <div className="mt-2">
          <span className="border-strong border-foreground bg-warning px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-warning-foreground">
            {discountLabel({
              amount: formatPrice(compare_at_price - price, currency),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
