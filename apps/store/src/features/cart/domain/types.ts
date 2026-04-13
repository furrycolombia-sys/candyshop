import type { Tables } from "api/supabase/types";

/** A cart item is the full product row + a quantity */
export interface CartItem extends Tables<"products"> {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  itemCount: number;
  total: number;
}

/** A group of cart items belonging to the same seller */
export interface SellerGroup {
  sellerId: string;
  items: CartItem[];
  subtotal: number;
}

/** A seller profile subset used for cart seller display names. */
export interface SellerProfile {
  id: string;
  display_name: string | null;
  email: string;
}
