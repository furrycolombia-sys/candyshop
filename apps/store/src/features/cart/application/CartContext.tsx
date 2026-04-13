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

import {
  COOKIE_KEY,
  persistCartCookie,
  removeCartCookie,
} from "./cartCookiePersistence";
import {
  addItemToItems,
  cartReducer,
  initialState,
  updateItemQuantity,
} from "./cartReducer";
import { isValidCartItems } from "./cartValidation";

import type { CartItem, CartState } from "@/features/cart/domain/types";

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
    try {
      const raw = getCookie(COOKIE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(String(raw));
        if (isValidCartItems(parsed)) {
          dispatch({ type: "HYDRATE", payload: parsed });
        }
      }
    } catch {
      // Ignore invalid stored data
    }
    // Mark mounted AFTER a tick so the persist effect skips the initial render
    requestAnimationFrame(() => {
      mountedRef.current = true;
    });
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
      persistCartCookie(addItemToItems(state.items, item));
      dispatch({ type: "ADD_ITEM", payload: item });
    },
    [state.items],
  );

  const removeItem = useCallback(
    (id: string) => {
      persistCartCookie(state.items.filter((item) => item.id !== id));
      dispatch({ type: "REMOVE_ITEM", payload: { id } });
    },
    [state.items],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      const nextItems = updateItemQuantity(state.items, id, quantity);
      if (nextItems.length === 0) {
        removeCartCookie();
      } else {
        persistCartCookie(nextItems);
      }
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
    },
    [state.items],
  );

  const clearCart = useCallback(() => {
    removeCartCookie();
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
