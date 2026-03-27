import type { createBrowserSupabaseClient } from "api/supabase";

/** Supabase client type alias used across checkout infrastructure. */
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

/**
 * Checkout feature domain types.
 *
 * CartItem matches the shape stored in the "candystore-cart" cookie
 * by the store app (full product row + quantity).
 */

export interface CartItem {
  id: string;
  name_en: string;
  name_es: string;
  price_cop: number;
  price_usd: number;
  seller_id: string | null;
  quantity: number;
  images: Array<{ url: string; alt: string }>;
  max_quantity: number | null;
  [key: string]: unknown;
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotalCop: number;
}

export interface SellerPaymentMethodWithType {
  id: string;
  type_name_en: string;
  type_name_es: string;
  type_icon: string | null;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
  account_details_en: string | null;
  account_details_es: string | null;
  seller_note_en: string | null;
  seller_note_es: string | null;
}

export type CheckoutSellerStatus =
  | "pending"
  | "submitting"
  | "submitted"
  | "error";

export interface SellerCheckoutState {
  status: CheckoutSellerStatus;
  selectedMethodId: string | null;
  transferNumber: string;
  receiptFile: File | null;
  orderId: string | null;
  error: string | null;
}
