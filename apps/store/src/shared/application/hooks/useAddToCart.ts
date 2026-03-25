"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCart } from "@/features/cart/application/CartContext";
import { useFlyToCartContext } from "@/features/cart/application/FlyToCartContext";
import type { Product } from "@/features/products/domain/types";
import { getCategoryColor } from "@/shared/domain/categoryConstants";

const ADDED_RESET_MS = 1500;

interface UseAddToCartReturn {
  added: boolean;
  quantityInCart: number;
  handleAddToCart: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Shared add-to-cart hook. Passes the full product to the cart
 * (CartItem = Product + quantity — same shape, no mapping).
 */
export function useAddToCart(product: Product): UseAddToCartReturn {
  const { addItem, items: cartItems } = useCart();
  const flyCtx = useFlyToCartContext();
  const [added, setAdded] = useState(false);
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

  const handleAddToCart = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Pass the full product — CartItem extends Product with quantity
      addItem(product);

      setAdded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAdded(false), ADDED_RESET_MS);

      // Fly-to-cart animation
      const rect = e.currentTarget.getBoundingClientRect();
      flyCtx?.fire(rect, getCategoryColor(product.category));
    },
    [addItem, product, flyCtx],
  );

  return { added, quantityInCart, handleAddToCart };
}
