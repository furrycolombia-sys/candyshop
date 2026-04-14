import { tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface ProductBadgesProps {
  product: Product;
  categoryColor: string;
  categoryForeground: string;
  tCategories: (key: string) => string;
  tTypes: (key: string) => string;
  t: (key: string) => string;
}

export function ProductBadges({
  product,
  categoryColor,
  categoryForeground,
  tCategories,
  tTypes,
  t,
}: ProductBadgesProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="border-2 border-foreground px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: categoryColor, color: categoryForeground }}
        {...tid("product-card-category")}
      >
        {tCategories(product.category)}
      </span>
      <span
        className="border-2 border-foreground px-2 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-muted-foreground"
        {...tid("product-card-type")}
      >
        {tTypes(product.type)}
      </span>
      {product.refundable === true && (
        <span className="border-2 border-foreground bg-success px-2 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-success-foreground">
          {t("refundable")}
        </span>
      )}
      {product.refundable === false && (
        <span className="border-2 border-foreground bg-warning px-2 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-warning-foreground">
          {t("nonRefundable")}
        </span>
      )}
    </div>
  );
}
