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
 * Encapsulates the add-to-cart logic shared by ProductCard, HeroSection,
 * and ProductDetailPage:
 * - Builds the cart item payload from a Product
 * - Manages the "added" feedback state with timeout cleanup
 * - Fires the fly-to-cart animation
 * - Returns the current quantity in cart
 */
export function useAddToCart(product: Product): UseAddToCartReturn {
  const { addItem, items: cartItems } = useCart();
  const flyCtx = useFlyToCartContext();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { id, name, price, currency, images, type, category } = product;
  const firstImageUrl = images[0]?.url;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const quantityInCart = useMemo(
    () => cartItems.find((i) => i.productId === id)?.quantity ?? 0,
    [cartItems, id],
  );

  const handleAddToCart = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      addItem({
        productId: id,
        name,
        price,
        currency,
        image: firstImageUrl,
        type,
        category,
      });
      setAdded(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAdded(false), ADDED_RESET_MS);

      // Fire fly-to-cart animation
      const rect = e.currentTarget.getBoundingClientRect();
      const color = getCategoryColor(category);
      flyCtx?.fire(rect, color);
    },
    [addItem, id, name, price, currency, firstImageUrl, type, category, flyCtx],
  );

  return { added, quantityInCart, handleAddToCart };
}
