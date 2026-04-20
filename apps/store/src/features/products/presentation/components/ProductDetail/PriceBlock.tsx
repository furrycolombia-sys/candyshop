import { useLocale } from "next-intl";
import { i18nCurrencyCode, i18nPrice, tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface PriceBlockProps {
  product: Product;
  discountLabel: (values: { amount: string }) => string;
}

export function PriceBlock({ product, discountLabel }: PriceBlockProps) {
  const locale = useLocale();

  const currencyCode = i18nCurrencyCode(product, locale);
  const isUsd = currencyCode === "USD";
  const price = isUsd ? product.price_usd : product.price_cop;
  const compareAtPrice = isUsd
    ? product.compare_at_price_usd
    : product.compare_at_price_cop;
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;

  return (
    <div
      className="border-strong border-foreground bg-background p-4 shadow-brutal-sm"
      {...tid("hero-price")}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {currencyCode}
          </span>
          <span className="min-w-0 break-all font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl">
            {i18nPrice(product, locale)}
          </span>
        </div>
        {hasDiscount && compareAtPrice != null && (
          <span className="font-display text-xl font-bold line-through text-muted-foreground sm:text-2xl">
            {i18nPrice(
              {
                ...product,
                price_usd: product.compare_at_price_usd ?? product.price_usd,
                price_cop: product.compare_at_price_cop ?? product.price_cop,
              },
              locale,
            )}
          </span>
        )}
      </div>
      {hasDiscount && compareAtPrice != null && (
        <div className="mt-2">
          <span className="border-strong border-foreground bg-warning px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-warning-foreground">
            {discountLabel({
              amount: i18nPrice(
                {
                  ...product,
                  price_usd:
                    (product.compare_at_price_usd ?? product.price_usd) -
                    product.price_usd,
                  price_cop:
                    (product.compare_at_price_cop ?? product.price_cop) -
                    product.price_cop,
                },
                locale,
              ),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
