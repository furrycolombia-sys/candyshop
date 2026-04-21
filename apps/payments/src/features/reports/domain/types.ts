export type { OrderStatus } from "@/shared/domain/types";

import type { OrderStatus } from "@/shared/domain/types";

export interface SellerReportOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  currency: string;
}

export interface SellerReportOrder {
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
  items: SellerReportOrderItem[];
}

export interface SellerReportFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: OrderStatus | null;
  buyerId: string | null;
  currency: string | null;
  amountMin: number | null;
  amountMax: number | null;
}

export interface SellerReportOrdersResponse {
  orders: SellerReportOrder[];
  total: number;
}
