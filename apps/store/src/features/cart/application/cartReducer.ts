import type { CartItem, CartState } from "@/features/cart/domain/types";

export type CartAction =
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

function toCartSnapshot(
  payload: Omit<CartItem, "quantity">,
): Omit<CartItem, "quantity"> {
  return {
    id: payload.id,
    name_en: payload.name_en,
    name_es: payload.name_es,
    price_cop: payload.price_cop,
    price_usd: payload.price_usd,
    seller_id: payload.seller_id,
    images: payload.images,
    max_quantity: payload.max_quantity,
    category: payload.category,
    type: payload.type,
    refundable: payload.refundable,
  };
}

export function addItemToItems(
  items: CartItem[],
  payload: Omit<CartItem, "quantity"> & { quantity?: number },
): CartItem[] {
  const { quantity = 1, ...rest } = payload;
  const snapshot = toCartSnapshot(rest);
  const existingIndex = items.findIndex((item) => item.id === snapshot.id);

  if (existingIndex !== -1) {
    return items.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            ...snapshot,
            quantity:
              snapshot.max_quantity === null
                ? item.quantity + quantity
                : Math.min(item.quantity + quantity, snapshot.max_quantity),
          }
        : item,
    );
  }

  return [
    ...items,
    {
      ...snapshot,
      quantity:
        snapshot.max_quantity === null
          ? quantity
          : Math.min(quantity, snapshot.max_quantity),
    },
  ];
}

export function updateItemQuantity(
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

export function deriveState(items: CartItem[]): CartState {
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce(
      (sum, item) => sum + (item.price_usd ?? 0) * item.quantity,
      0,
    ),
  };
}

export const initialState: CartState = {
  items: [],
  itemCount: 0,
  total: 0,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      return deriveState(addItemToItems(state.items, action.payload));
    }

    case "REMOVE_ITEM": {
      const filtered = state.items.filter(
        (item) => item.id !== action.payload.id,
      );
      return deriveState(filtered);
    }

    case "UPDATE_QUANTITY": {
      const { id, quantity } = action.payload;
      return deriveState(updateItemQuantity(state.items, id, quantity));
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
