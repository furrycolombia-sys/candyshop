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
