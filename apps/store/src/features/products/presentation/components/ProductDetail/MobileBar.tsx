"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice, tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";

interface MobileBarProps {
  product: Product;
  isAdded: boolean;
  hasReachedStockLimit: boolean;
  onAddToCart: (e: React.MouseEvent<HTMLButtonElement>) => void;
  theme: CategoryTheme;
  quantityInCart: number;
}

export function MobileBar({
  product,
  isAdded,
  hasReachedStockLimit,
  onAddToCart,
  theme,
  quantityInCart,
}: MobileBarProps) {
  const t = useTranslations("products");

  return (
    <div
      className="sticky bottom-0 z-40 flex items-center justify-between gap-3 border-t-strong border-foreground bg-background p-3 sm:px-4 lg:hidden"
      {...tid("product-detail-mobile-bar")}
    >
      <div className="min-w-0 flex flex-col">
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="min-w-0 break-all font-display text-lg font-extrabold sm:text-xl">
            {formatPrice(product.price, product.currency)}
          </span>
        </span>
        {quantityInCart > 0 && (
          <span className="flex items-center gap-1 text-label-xs font-bold uppercase tracking-widest sm:text-xs">
            <ShoppingCart className="size-3" />
            {t("inCart", { count: quantityInCart })}
          </span>
        )}
      </div>
      <button
        type="button"
        className="button-brutal button-press-sm shadow-brutal-md min-w-40 flex-1 px-4 py-3 font-display text-xs font-extrabold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        style={{ backgroundColor: theme.bg, color: theme.foreground }}
        onClick={onAddToCart}
        disabled={
          !isProductAvailable(product) || isAdded || hasReachedStockLimit
        }
        {...tid("product-detail-mobile-add-to-cart")}
      >
        {isAdded ? t("addedToCart") : t("addToCart")}
      </button>
    </div>
  );
}
