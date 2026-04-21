"use client";

import { getCookie } from "cookies-next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { CartCookieItem } from "shared/types";

import {
  COOKIE_KEY,
  persistCartCookie,
  removeCartCookie,
} from "./cartCookiePersistence";
import { cartReducer, initialState } from "./cartReducer";
import { isValidCartItems } from "./cartValidation";

import type { CartItem, CartState } from "@/features/cart/domain/types";
import { fetchStoreProductsByIds } from "@/features/products/infrastructure/productQueries";

interface CartContextValue extends CartState {
  addItem: (
    product: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const mountedRef = useRef(false);

  // Hydrate from cookie on mount
  useEffect(() => {
    let isActive = true;

    async function hydrateFromCookie() {
      try {
        const raw = getCookie(COOKIE_KEY);
        if (!raw) return;

        const parsed: unknown = JSON.parse(String(raw));
        if (!isValidCartItems(parsed)) return;

        const cookieItems = parsed as CartCookieItem[];
        if (cookieItems.length === 0) return;

        const products = await fetchStoreProductsByIds(
          cookieItems.map((item) => item.id),
        );
        if (!isActive) return;

        const productById = new Map(
          products.map((product) => [product.id, product]),
        );
        const hydratedItems: CartItem[] = cookieItems
          .map((cookieItem) => {
            const product = productById.get(cookieItem.id);
            if (!product) return null;

            const quantity =
              product.max_quantity === null
                ? cookieItem.quantity
                : Math.min(cookieItem.quantity, product.max_quantity);

            return {
              id: product.id,
              name_en: product.name_en,
              name_es: product.name_es,
              price: product.price,
              currency: product.currency,
              seller_id: product.seller_id,
              images: product.images,
              max_quantity: product.max_quantity,
              category: product.category,
              type: product.type,
              refundable: product.refundable,
              quantity,
            };
          })
          .filter((item): item is CartItem => item !== null);

        if (hydratedItems.length > 0) {
          dispatch({ type: "HYDRATE", payload: hydratedItems });
        }
      } catch {
        // Ignore invalid stored data
      } finally {
        if (!isActive) return;
        requestAnimationFrame(() => {
          if (!isActive) return;
          mountedRef.current = true;
        });
      }
    }

    void hydrateFromCookie();

    return () => {
      isActive = false;
    };
  }, []);

  // Persist to cookie — skips the first render (before hydration completes)
  useEffect(() => {
    if (!mountedRef.current) return;
    try {
      if (state.items.length === 0) {
        removeCartCookie();
      } else {
        persistCartCookie(state.items);
      }
    } catch {
      // Ignore cookie errors
    }
  }, [state.items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      dispatch({ type: "ADD_ITEM", payload: item });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { id } });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const value: CartContextValue = useMemo(
    () => ({
      ...state,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
