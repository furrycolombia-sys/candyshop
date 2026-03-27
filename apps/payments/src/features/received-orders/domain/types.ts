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
  expires_at: string | null;
  checkout_session_id: string | null;
  created_at: string;
  buyer_name: string;
  items: OrderItem[];
}

export type SellerAction = "approved" | "rejected" | "evidence_requested";
