/**
 * Re-export payment method types from the shared layer.
 *
 * These types were promoted to `@/shared/domain/PaymentMethodTypes` because
 * they are used across multiple features (checkout, orders, API routes).
 * This re-export keeps internal payment-methods imports working unchanged.
 */
export type {
  BuyerSubmission,
  DisplayBlock,
  DisplayBlockType,
  FormField,
  FormFieldType,
  ImageBlock,
  LinkBlock,
  SellerPaymentMethod,
  TextBlock,
  UrlBlock,
  VideoBlock,
} from "@/shared/domain/PaymentMethodTypes";

import type { SellerPaymentMethod } from "@/shared/domain/PaymentMethodTypes";

export interface CreatePaymentMethodParams {
  sellerId: string;
  nameEn: string;
  nameEs?: string;
}

export type UpdatePaymentMethodPatch = Partial<
  Pick<
    SellerPaymentMethod,
    | "name_en"
    | "name_es"
    | "display_blocks"
    | "form_fields"
    | "is_active"
    | "requires_receipt"
    | "requires_transfer_number"
    | "sort_order"
  >
>;

export interface UpdatePaymentMethodParams {
  id: string;
  patch: UpdatePaymentMethodPatch;
}
