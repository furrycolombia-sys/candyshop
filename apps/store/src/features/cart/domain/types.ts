import type { Tables } from "api/types/database";

/** A cart item is the full product row + a quantity */
export interface CartItem extends Tables<"products"> {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  itemCount: number;
  total: number;
}
