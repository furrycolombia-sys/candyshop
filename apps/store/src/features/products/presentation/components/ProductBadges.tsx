import { tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface ProductBadgesProps {
  product: Product;
  categoryColor: string;
  tCategories: (key: string) => string;
  tTypes: (key: string) => string;
  t: (key: string) => string;
}

export function ProductBadges({
  product,
  categoryColor,
  tCategories,
  tTypes,
  t,
}: ProductBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`${categoryColor} border-2 border-foreground px-2 py-0.5 text-xs font-bold text-foreground`}
        {...tid("product-card-category")}
      >
        {tCategories(product.category)}
      </span>
      <span
        className="border-2 border-foreground px-2 py-0.5 text-tiny font-bold uppercase tracking-widest text-muted-foreground"
        {...tid("product-card-type")}
      >
        {tTypes(product.type)}
      </span>
      {product.refundable === true && (
        <span className="bg-mint border-2 border-foreground px-2 py-0.5 text-tiny font-bold uppercase tracking-widest text-foreground">
          {t("refundable")}
        </span>
      )}
      {product.refundable === false && (
        <span className="bg-peach border-2 border-foreground px-2 py-0.5 text-tiny font-bold uppercase tracking-widest text-foreground">
          {t("nonRefundable")}
        </span>
      )}
    </div>
  );
}
