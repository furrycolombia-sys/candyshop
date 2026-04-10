"use client";

import { deleteCookie, getCookie, setCookie } from "cookies-next";
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
const MINIMUM_DOMAIN_SEGMENTS = 2;
const DOMAIN_SUFFIX_SEGMENT_OFFSET = -2;
/** Cookie lives for 30 days */
const COOKIE_MAX_AGE_S =
  DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

function getSharedCookieDomain(hostname: string): string | undefined {
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  const parts = hostname.split(".");
  if (parts.length < MINIMUM_DOMAIN_SEGMENTS) return undefined;

  return `.${parts.slice(DOMAIN_SUFFIX_SEGMENT_OFFSET).join(".")}`;
}

function getCartCookieOptions() {
  const isSecure =
    globalThis.window !== undefined &&
    globalThis.location.protocol === "https:";
  let sharedDomain: string | undefined;
  if (globalThis.window !== undefined) {
    sharedDomain = getSharedCookieDomain(globalThis.location.hostname);
  }

  return {
    path: "/",
    ...(sharedDomain ? { domain: sharedDomain } : {}),
    sameSite: "lax" as const,
    secure: isSecure,
  };
}

function persistCartCookie(items: CartItem[]) {
  const cookieOptions = getCartCookieOptions();

  if (cookieOptions.domain) {
    deleteCookie(COOKIE_KEY, { path: "/" });
  }

  setCookie(COOKIE_KEY, JSON.stringify(items), {
    ...cookieOptions,
    maxAge: COOKIE_MAX_AGE_S,
  });
}

function removeCartCookie() {
  const cookieOptions = getCartCookieOptions();
  deleteCookie(COOKIE_KEY, cookieOptions);

  if (cookieOptions.domain !== undefined) {
    deleteCookie(COOKIE_KEY, { path: "/" });
  }
}

function addItemToItems(
  items: CartItem[],
  payload: Omit<CartItem, "quantity"> & { quantity?: number },
): CartItem[] {
  const { quantity = 1, ...rest } = payload;
  const existingIndex = items.findIndex((item) => item.id === rest.id);

  if (existingIndex !== -1) {
    return items.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            quantity:
              item.max_quantity === null
                ? item.quantity + quantity
                : Math.min(item.quantity + quantity, item.max_quantity),
          }
        : item,
    );
  }

  return [
    ...items,
    {
      ...rest,
      quantity:
        rest.max_quantity === null
          ? quantity
          : Math.min(quantity, rest.max_quantity),
    },
  ];
}

function updateItemQuantity(
  items: CartItem[],
  id: string,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) {
    return items.filter((item) => item.id !== id);
  }

  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          quantity:
            item.max_quantity === null
              ? quantity
              : Math.min(quantity, item.max_quantity),
        }
      : item,
  );
}

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
            ? {
                ...item,
                quantity:
                  item.max_quantity === null
                    ? item.quantity + quantity
                    : Math.min(item.quantity + quantity, item.max_quantity),
              }
            : item,
        );
        return deriveState(updatedItems);
      }

      return deriveState([
        ...state.items,
        {
          ...rest,
          quantity:
            rest.max_quantity === null
              ? quantity
              : Math.min(quantity, rest.max_quantity),
        },
      ]);
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
        item.id === id
          ? {
              ...item,
              quantity:
                item.max_quantity === null
                  ? quantity
                  : Math.min(quantity, item.max_quantity),
            }
          : item,
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
