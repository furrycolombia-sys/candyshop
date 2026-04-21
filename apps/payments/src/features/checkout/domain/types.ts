/**
 * Checkout feature domain types.
 *
 * CartItem is the enriched checkout shape after resolving product IDs from
 * the "candystore-cart" cookie ({id, quantity}) against the backend.
 */

export interface CartItem {
  id: string;
  name_en: string;
  name_es: string;
  price: number;
  currency: string;
  seller_id: string | null;
  /** Display/subtotal quantity — capped to max_quantity. */
  quantity: number;
  /** Original cookie quantity — used for stock validation. Falls back to quantity if not set. */
  rawQuantity?: number;
  images: Array<{ url: string; alt: string }>;
  max_quantity: number | null;
  [key: string]: unknown;
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
}

import type {
  DisplayBlock,
  FormField,
} from "@/shared/domain/PaymentMethodTypes";

export interface SellerPaymentMethodWithType {
  id: string;
  name_en: string;
  name_es: string | null;
  display_blocks: DisplayBlock[];
  form_fields: FormField[];
  is_active: boolean;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
}

/** @deprecated Use SellerPaymentMethodWithType (new flat shape) */
export interface BuyerFieldDescriptor {
  key: string;
  type: "text" | "email";
  required: boolean;
}

export interface CheckoutPaymentMethodsResponse {
  methods: SellerPaymentMethodWithType[];
  hasStockIssues: boolean;
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
  buyerInfo: Record<string, string>;
  orderId: string | null;
  error: string | null;
}
