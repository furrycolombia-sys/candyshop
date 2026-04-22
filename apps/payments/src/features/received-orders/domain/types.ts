export type { OrderItem, OrderStatus } from "@/shared/domain/types";

import type { OrderItem, OrderStatus } from "@/shared/domain/types";

export interface ReceivedOrder {
  id: string;
  user_id: string;
  seller_id: string | null;
  payment_status: OrderStatus;
  total: number;
  currency: string;
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
  /** Set on delegated orders — true if the delegate holds management permissions */
  can_manage?: boolean;
}

export type SellerAction = "approved" | "rejected" | "evidence_requested";

/** Whether the seller can approve or reject an order in this status */
export function canActOnOrder(status: OrderStatus): boolean {
  return status === "pending_verification" || status === "evidence_requested";
}

/** Whether the seller can request additional evidence */
export function canRequestEvidence(status: OrderStatus): boolean {
  return status === "pending_verification";
}
