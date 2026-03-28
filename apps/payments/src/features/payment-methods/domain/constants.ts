import type { SellerPaymentMethodFormValues } from "./types";

export const PAYMENT_METHODS_QUERY_KEY = "seller-payment-methods";
export const PAYMENT_TYPES_QUERY_KEY = "payment-method-types";

export const SELLER_PAYMENT_METHOD_DEFAULTS: SellerPaymentMethodFormValues = {
  type_id: "",
  account_details_en: "",
  account_details_es: "",
  seller_note_en: "",
  seller_note_es: "",
  is_active: true,
};
