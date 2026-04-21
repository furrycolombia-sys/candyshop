import type { Product } from "shared/types";

type CartProductSnapshot = Pick<
  Product,
  | "id"
  | "name_en"
  | "name_es"
  | "price"
  | "currency"
  | "seller_id"
  | "images"
  | "max_quantity"
  | "category"
  | "type"
  | "refundable"
>;

/** A cart item is a compact product snapshot + quantity for cookie portability */
export interface CartItem extends CartProductSnapshot {
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
