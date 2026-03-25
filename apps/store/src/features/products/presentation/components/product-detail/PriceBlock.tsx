import { useLocale } from "next-intl";
import { i18nPrice, tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface PriceBlockProps {
  product: Product;
  discountLabel: (values: { amount: string }) => string;
}

export function PriceBlock({ product, discountLabel }: PriceBlockProps) {
  const locale = useLocale();

  const isEnglish = locale === "en";
  const currencyLabel = isEnglish ? "USD" : "COP";
  const price = isEnglish ? product.price_usd : product.price_cop;
  const compareAtPrice = isEnglish
    ? product.compare_at_price_usd
    : product.compare_at_price_cop;
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;

  return (
    <div
      className="border-3 border-foreground bg-background p-4 nb-shadow-sm"
      {...tid("hero-price")}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {currencyLabel}
          </span>
          <span className="font-display text-5xl font-extrabold">
            {i18nPrice(product, locale)}
          </span>
        </div>
        {hasDiscount && compareAtPrice != null && (
          <span className="font-display text-2xl font-bold line-through text-muted-foreground">
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
          <span className="bg-lemon border-3 border-foreground px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
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
