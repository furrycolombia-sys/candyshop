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

export interface BuyerFieldDescriptor {
  key: string;
  type: "text" | "email";
  required: boolean;
}

export interface SellerPaymentMethodWithType {
  id: string;
  type_name_en: string;
  type_name_es: string;
  type_icon: string | null;
  requires_receipt: boolean;
  requires_transfer_number: boolean;
  required_buyer_fields: BuyerFieldDescriptor[];
  account_details_en: string | null;
  account_details_es: string | null;
  seller_note_en: string | null;
  seller_note_es: string | null;
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
