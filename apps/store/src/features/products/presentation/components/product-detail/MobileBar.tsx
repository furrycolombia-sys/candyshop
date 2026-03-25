"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";

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

  return (
    <div
      className="lg:hidden sticky bottom-0 z-40 bg-background border-t-[3px] border-foreground px-4 py-3 flex items-center justify-between gap-4"
      {...tid("product-detail-mobile-bar")}
    >
      <div className="flex flex-col">
        <span className="font-display text-2xl font-extrabold">
          ${product.price.toLocaleString()}
        </span>
        {quantityInCart > 0 ? (
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
            <ShoppingCart className="size-3" />
            {t("inCart", { count: quantityInCart })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            {product.currency}
          </span>
        )}
      </div>
      <button
        className={`flex-1 nb-btn nb-btn-press-sm nb-shadow-md font-display text-sm font-extrabold uppercase tracking-widest py-3 disabled:opacity-50 disabled:cursor-not-allowed ${theme.bg}`}
        onClick={onAddToCart}
        disabled={!product.inStock || added}
        {...tid("product-detail-mobile-add-to-cart")}
      >
        {added ? t("addedToCart") : t("addToCart")}
      </button>
    </div>
  );
}
