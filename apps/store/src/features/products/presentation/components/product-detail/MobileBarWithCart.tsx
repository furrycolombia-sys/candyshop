"use client";

import { MobileBar } from "./MobileBar";

import type { Product } from "@/features/products/domain/types";
import { useAddToCart } from "@/shared/application/hooks/useAddToCart";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

interface MobileBarWithCartProps {
  product: Product;
  theme: CategoryTheme;
}

/** Connects MobileBar to the shared add-to-cart hook */
export function MobileBarWithCart({ product, theme }: MobileBarWithCartProps) {
  const { added, quantityInCart, hasReachedStockLimit, handleAddToCart } =
    useAddToCart(product);

  return (
    <MobileBar
      product={product}
      added={added}
      hasReachedStockLimit={hasReachedStockLimit}
      onAddToCart={handleAddToCart}
      theme={theme}
      quantityInCart={quantityInCart}
    />
  );
}
