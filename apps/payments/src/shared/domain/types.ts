import type { Database, Json } from "api/supabase/types";

export type { SupabaseClient } from "shared/types/supabase";

/** Reuse the Supabase enum as the single source of truth for order status. */
export type OrderStatus = Database["public"]["Enums"]["payment_status"];

/** Shape of a row returned by Supabase when selecting orders + order_items. */
export interface OrderRow {
  id: string;
  user_id: string;
  seller_id: string | null;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  seller_note: string | null;
  buyer_info: Json | null;
  expires_at: string | null;
  checkout_session_id: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    currency: string;
    metadata: Record<string, unknown>;
  }>;
}

/** A single item within an order. */
export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  metadata: Record<string, unknown>;
}
