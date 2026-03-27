import type { PaymentMethodTypeFormValues } from "./types";

export const PAYMENT_METHOD_TYPES_QUERY_KEY = "payment-method-types";

export const PAYMENT_METHOD_TYPE_FORM_DEFAULTS: PaymentMethodTypeFormValues = {
  name_en: "",
  name_es: "",
  description_en: "",
  description_es: "",
  icon: "",
  requires_receipt: true,
  requires_transfer_number: true,
  is_active: true,
};
