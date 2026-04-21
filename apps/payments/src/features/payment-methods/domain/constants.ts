import { AlignLeft, Hash, Mail, Type } from "lucide-react";

import type { FormFieldType } from "./types";

export const PAYMENT_METHODS_QUERY_KEY = "seller-payment-methods";

/** React Query base key for payment methods list queries */
export const PAYMENT_METHODS_LIST_QUERY_KEY = "payment-methods";

export const FIELD_TYPE_ICONS: Record<FormFieldType, typeof Type> = {
  text: Type,
  email: Mail,
  number: Hash,
  textarea: AlignLeft,
};
