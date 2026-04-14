export type { OrderItem, OrderStatus } from "@/shared/domain/types";

import type { OrderItem, OrderStatus } from "@/shared/domain/types";

export interface OrderWithItems {
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
  payment_method_id: string | null;
  items: OrderItem[];
  seller_name: string;
}

/** Group of orders from the same checkout session. */
export interface CheckoutGroup {
  checkoutSessionId: string | null;
  createdAt: string;
  orders: OrderWithItems[];
}
