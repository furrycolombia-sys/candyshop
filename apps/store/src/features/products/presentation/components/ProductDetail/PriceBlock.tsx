import { formatPrice, tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface PriceBlockProps {
  product: Product;
  discountLabel: (values: { amount: string }) => string;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PriceBlock({ product, discountLabel }: PriceBlockProps) {
  const { price, currency, compare_at_price } = product;
  const hasDiscount = compare_at_price != null && compare_at_price > price;

  return (
    <div
      className="border-strong border-foreground bg-background shadow-brutal-sm"
      {...tid("hero-price")}
    >
      <div className="flex items-stretch">
        {/* Currency badge */}
        <div className="flex items-center border-r-2 border-foreground bg-muted px-3">
          <span className="font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            {currency}
          </span>
        </div>

        {/* Amount + discount */}
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0 px-4 py-3">
          <span
            className="font-display text-3xl font-extrabold leading-none sm:text-4xl"
            {...tid("hero-price-amount")}
          >
            {formatAmount(price)}
          </span>

          {hasDiscount && compare_at_price != null && (
            <span className="font-display text-lg font-bold leading-none line-through text-muted-foreground">
              {formatAmount(compare_at_price)}
            </span>
          )}

          {hasDiscount && compare_at_price != null && (
            <span className="border-strong border-foreground bg-warning px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-warning-foreground">
              {discountLabel({
                amount: formatPrice(compare_at_price - price, currency),
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
