"use client";

import { MobileBar } from "./MobileBar";

import { useAddToCart } from "@/features/cart";
import type { Product } from "@/features/products/domain/types";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

interface MobileBarWithCartProps {
  product: Product;
  theme: CategoryTheme;
}

/** Connects MobileBar to the shared add-to-cart hook */
export function MobileBarWithCart({ product, theme }: MobileBarWithCartProps) {
  const { isAdded, quantityInCart, hasReachedStockLimit, handleAddToCart } =
    useAddToCart(product);

  return (
    <MobileBar
      product={product}
      isAdded={isAdded}
      hasReachedStockLimit={hasReachedStockLimit}
      onAddToCart={handleAddToCart}
      theme={theme}
      quantityInCart={quantityInCart}
    />
  );
}
