"use client";

import { getCookie, setCookie } from "cookies-next";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import type { CartItem, CartState } from "@/features/cart/domain/types";

function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  // Check the essential fields — the rest comes from the full product row
  return (
    typeof record.id === "string" &&
    typeof record.price_usd === "number" &&
    typeof record.quantity === "number"
  );
}

/** Validates that parsed cookie data is an array of cart items with required fields */
function isValidCartItems(data: unknown): data is CartItem[] {
  return Array.isArray(data) && data.every((item) => isValidCartItem(item));
}

const COOKIE_KEY = "candystore-cart";
const DAYS = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
/** Cookie lives for 30 days */
const COOKIE_MAX_AGE_S =
  DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

type CartAction =
  | {
      type: "ADD_ITEM";
      payload: Omit<CartItem, "quantity"> & { quantity?: number };
    }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | {
      type: "UPDATE_QUANTITY";
      payload: { id: string; quantity: number };
    }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartItem[] };

interface CartContextValue extends CartState {
  addItem: (
    product: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

function deriveState(items: CartItem[]): CartState {
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0),
  };
}

const initialState: CartState = {
  items: [],
  itemCount: 0,
  total: 0,
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { quantity = 1, ...rest } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) => item.id === rest.id,
      );

      if (existingIndex !== -1) {
        const updatedItems = state.items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
        return deriveState(updatedItems);
      }

      return deriveState([...state.items, { ...rest, quantity }]);
    }

    case "REMOVE_ITEM": {
      const filtered = state.items.filter(
        (item) => item.id !== action.payload.id,
      );
      return deriveState(filtered);
    }

    case "UPDATE_QUANTITY": {
      const { id, quantity } = action.payload;

      if (quantity <= 0) {
        const filtered = state.items.filter((item) => item.id !== id);
        return deriveState(filtered);
      }

      const updatedItems = state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      );
      return deriveState(updatedItems);
    }

    case "CLEAR_CART": {
      return initialState;
    }

    case "HYDRATE": {
      return deriveState(action.payload);
    }

    default: {
      return state;
    }
  }
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
      const isSecure =
        globalThis.window !== undefined &&
        globalThis.location.protocol === "https:";
      setCookie(COOKIE_KEY, JSON.stringify(state.items), {
        maxAge: COOKIE_MAX_AGE_S,
        path: "/",
        sameSite: "lax",
        secure: isSecure,
      });
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
