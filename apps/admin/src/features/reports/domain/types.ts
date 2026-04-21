export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "pending_verification"
  | "evidence_requested"
  | "approved"
  | "rejected"
  | "expired";

export interface ReportOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface ReportOrder {
  id: string;
  created_at: string;
  payment_status: OrderStatus;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  buyer_id: string;
  buyer_email: string;
  buyer_display_name: string | null;
  seller_id: string | null;
  seller_email: string | null;
  seller_display_name: string | null;
  items: ReportOrderItem[];
}

export interface ReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: OrderStatus | null;
  sellerId: string | null;
  buyerId: string | null;
  productId: string | null;
  currency: string | null;
  amountMin: number | null;
  amountMax: number | null;
}

export interface ReportOrdersResponse {
  orders: ReportOrder[];
  total: number;
}

export interface UserOption {
  id: string;
  email: string;
  display_name: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
}
