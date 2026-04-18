"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "shared/types";

import { useCart } from "../CartContext";
import { useFlyToCartContext } from "../FlyToCartContext";

import { getCategoryColor } from "@/shared/domain/categoryConstants";

const ADDED_RESET_MS = 1500;

interface UseAddToCartReturn {
  isAdded: boolean;
  quantityInCart: number;
  hasReachedStockLimit: boolean;
  handleAddToCart: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Add-to-cart hook. Passes the full product to the cart
 * (CartItem = Product + quantity — same shape, no mapping).
 */
export function useAddToCart(product: Product): UseAddToCartReturn {
  const { addItem, items: cartItems } = useCart();
  const flyCtx = useFlyToCartContext();
  const [isAdded, setIsAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const quantityInCart = useMemo(
    () => cartItems.find((i) => i.id === product.id)?.quantity ?? 0,
    [cartItems, product.id],
  );
  const hasReachedStockLimit =
    product.max_quantity !== null && quantityInCart >= product.max_quantity;

  const handleAddToCart = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (hasReachedStockLimit) {
        return;
      }

      // Pass the full product — CartItem extends Product with quantity
      addItem(product);

      setIsAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsAdded(false), ADDED_RESET_MS);

      // Fly-to-cart animation
      const rect = e.currentTarget.getBoundingClientRect();
      flyCtx?.fire(rect, getCategoryColor(product.category));
    },
    [addItem, product, flyCtx, hasReachedStockLimit],
  );

  return { isAdded, quantityInCart, hasReachedStockLimit, handleAddToCart };
}
