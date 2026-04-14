export type { OrderItem, OrderStatus } from "@/shared/domain/types";

import type { OrderItem, OrderStatus } from "@/shared/domain/types";

export interface ReceivedOrder {
  id: string;
  user_id: string;
  seller_id: string | null;
  payment_status: OrderStatus;
  total_cop: number;
  transfer_number: string | null;
  receipt_url: string | null;
  seller_note: string | null;
  buyer_info: Record<string, string> | null;
  expires_at: string | null;
  checkout_session_id: string | null;
  created_at: string;
  buyer_name: string;
  items: OrderItem[];
  /** Non-null when the order belongs to a seller who delegated to the current user */
  seller_name: string | null;
}

export type SellerAction = "approved" | "rejected" | "evidence_requested";
