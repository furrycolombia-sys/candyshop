import { tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface PriceBlockProps {
  product: Product;
  discountLabel: (values: { amount: string }) => string;
}

export function PriceBlock({ product, discountLabel }: PriceBlockProps) {
  const compareAtPrice = product.compareAtPrice;
  const hasDiscount =
    compareAtPrice !== undefined && compareAtPrice > product.price;

  return (
    <div
      className="border-[3px] border-foreground bg-background p-4 nb-shadow-sm"
      {...tid("hero-price")}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-display text-5xl font-extrabold">
          ${product.price.toLocaleString()}
        </span>
        <span className="text-sm font-sans text-muted-foreground">
          {product.currency}
        </span>
        {hasDiscount && compareAtPrice !== undefined && (
          <span className="font-display text-2xl font-bold line-through text-muted-foreground">
            ${compareAtPrice.toLocaleString()}
          </span>
        )}
      </div>
      {hasDiscount && compareAtPrice !== undefined && (
        <div className="mt-2">
          <span className="bg-(--lemon) border-[3px] border-foreground px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
            {discountLabel({
              amount: `$${(compareAtPrice - product.price).toLocaleString()}`,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
