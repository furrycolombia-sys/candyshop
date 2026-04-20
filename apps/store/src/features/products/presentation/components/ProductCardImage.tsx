import { ShoppingCart } from "lucide-react";
import { getCoverImageUrl, tid } from "shared";
import { cn } from "ui";

import { FeaturedRibbon } from "./FeaturedRibbon";

import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";

interface ProductCardImageProps {
  product: Product;
  categoryColor: string;
  categoryForeground: string;
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
  categoryForeground,
  isFeatured,
  featuredLabel,
  outOfStockLabel,
  typeLabel,
  quantityInCart = 0,
  inCartLabel,
}: ProductCardImageProps) {
  const imageUrl = getCoverImageUrl(product.images);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden border-foreground",
        isFeatured
          ? "h-56 sm:h-auto sm:w-1/2 border-b-strong sm:border-b-0 sm:border-r-3"
          : "h-48 border-b-strong",
      )}
      style={{ backgroundColor: categoryColor }}
      {...tid("product-card-image")}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-provided image URLs can come from arbitrary hosts
        <img
          src={imageUrl}
          alt={product.name_en}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          data-testid="next-image"
        />
      ) : (
        <span
          className={cn(
            "font-display font-extrabold uppercase tracking-widest opacity-40",
            isFeatured ? "text-2xl sm:text-4xl" : "text-lg",
          )}
          style={{ color: categoryForeground }}
        >
          {typeLabel}
        </span>
      )}

      {product.featured && (
        <FeaturedRibbon
          label={featuredLabel}
          accentVar={getCategoryTheme(product.category).accent}
          size={isFeatured ? "lg" : "sm"}
        />
      )}

      {/* In-cart stamp */}
      {quantityInCart > 0 && inCartLabel && (
        <span
          className="absolute top-2 right-2 flex items-center gap-1 bg-foreground text-background text-ui-xs font-bold uppercase tracking-widest px-2 py-0.5 z-10"
          {...tid("product-card-in-cart")}
        >
          <ShoppingCart className="size-3" />
          {inCartLabel}
        </span>
      )}

      {!isProductAvailable(product) && (
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 z-10">
          <span className="font-display text-base font-extrabold uppercase tracking-widest text-background">
            {outOfStockLabel}
          </span>
        </span>
      )}
    </div>
  );
}
