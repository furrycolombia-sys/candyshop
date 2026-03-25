import { ShoppingCart } from "lucide-react";
import { tid } from "shared";

import type { Product } from "@/features/products/domain/types";

interface ProductCardImageProps {
  product: Product;
  categoryColor: string;
  isFeatured: boolean;
  featuredLabel: string;
  outOfStockLabel: string;
  typeLabel: string;
  quantityInCart?: number;
  inCartLabel?: string;
}

export function ProductCardImage({
  product,
  categoryColor,
  isFeatured,
  featuredLabel,
  outOfStockLabel,
  typeLabel,
  quantityInCart = 0,
  inCartLabel,
}: ProductCardImageProps) {
  return (
    <div
      className={`relative flex items-center justify-center border-foreground ${categoryColor} ${
        isFeatured
          ? "h-56 sm:h-auto sm:w-1/2 border-b-[3px] sm:border-b-0 sm:border-r-[3px]"
          : "h-48 border-b-[3px]"
      }`}
      {...tid("product-card-image")}
    >
      <span
        className={`font-display font-extrabold uppercase tracking-widest text-foreground opacity-40 ${
          isFeatured ? "text-2xl sm:text-4xl" : "text-lg"
        }`}
      >
        {typeLabel}
      </span>

      {product.featured && (
        <span
          className={`absolute top-2 left-2 bg-foreground text-background font-bold uppercase tracking-widest px-2 py-0.5 ${
            isFeatured ? "text-xs" : "text-[10px]"
          }`}
        >
          {featuredLabel}
        </span>
      )}

      {/* In-cart stamp */}
      {quantityInCart > 0 && inCartLabel && (
        <span
          className="absolute top-2 right-2 flex items-center gap-1 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
          {...tid("product-card-in-cart")}
        >
          <ShoppingCart className="size-3" />
          {inCartLabel}
        </span>
      )}

      {(!product.is_active || product.max_quantity === 0) && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/60">
          <span className="font-display text-base font-extrabold uppercase tracking-widest text-background">
            {outOfStockLabel}
          </span>
        </span>
      )}
    </div>
  );
}
