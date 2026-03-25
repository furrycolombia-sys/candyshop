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
  onAddToCart: (e: React.MouseEvent<HTMLButtonElement>) => void;
  theme: CategoryTheme;
  quantityInCart: number;
}

export function MobileBar({
  product,
  added,
  onAddToCart,
  theme,
  quantityInCart,
}: MobileBarProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  return (
    <div
      className="lg:hidden sticky bottom-0 z-40 bg-background border-t-3 border-foreground px-4 py-3 flex items-center justify-between gap-4"
      {...tid("product-detail-mobile-bar")}
    >
      <div className="flex flex-col">
        <span className="font-display text-2xl font-extrabold">
          {i18nPrice(product, locale)}
        </span>
        {quantityInCart > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
            <ShoppingCart className="size-3" />
            {t("inCart", { count: quantityInCart })}
          </span>
        )}
      </div>
      <button
        className={`flex-1 nb-btn nb-btn-press-sm nb-shadow-md font-display text-sm font-extrabold uppercase tracking-widest py-3 disabled:opacity-50 disabled:cursor-not-allowed ${theme.bg}`}
        onClick={onAddToCart}
        disabled={!isProductAvailable(product) || added}
        {...tid("product-detail-mobile-add-to-cart")}
      >
        {added ? t("addedToCart") : t("addToCart")}
      </button>
    </div>
  );
}
