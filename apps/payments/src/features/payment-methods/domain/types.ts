/**
 * Re-export payment method types from the shared layer.
 *
 * These types were promoted to `@/shared/domain/paymentMethodTypes` because
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
} from "@/shared/domain/paymentMethodTypes";

import type { SellerPaymentMethod } from "@/shared/domain/paymentMethodTypes";

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
    | "sort_order"
  >
>;

export interface UpdatePaymentMethodParams {
  id: string;
  patch: UpdatePaymentMethodPatch;
}
