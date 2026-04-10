"use client";

import { ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { i18nPrice, tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";

interface MobileBarProps {
  product: Product;
  added: boolean;
  hasReachedStockLimit: boolean;
  onAddToCart: (e: React.MouseEvent<HTMLButtonElement>) => void;
  theme: CategoryTheme;
  quantityInCart: number;
}

export function MobileBar({
  product,
  added,
  hasReachedStockLimit,
  onAddToCart,
  theme,
  quantityInCart,
}: MobileBarProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  return (
    <div
      className="sticky bottom-0 z-40 flex items-center justify-between gap-3 border-t-strong border-foreground bg-background p-3 sm:px-4 lg:hidden"
      {...tid("product-detail-mobile-bar")}
    >
      <div className="min-w-0 flex flex-col">
        <span className="truncate font-display text-xl font-extrabold sm:text-2xl">
          {i18nPrice(product, locale)}
        </span>
        {quantityInCart > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest sm:text-xs">
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
        disabled={!isProductAvailable(product) || added || hasReachedStockLimit}
        {...tid("product-detail-mobile-add-to-cart")}
      >
        {added ? t("addedToCart") : t("addToCart")}
      </button>
    </div>
  );
}
