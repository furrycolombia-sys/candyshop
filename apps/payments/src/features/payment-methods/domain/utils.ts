import { i18nField } from "shared";

import type { PaymentMethodType } from "./types";

/** Resolve the localized name for a payment method type */
export function getPaymentTypeName(
  types: PaymentMethodType[],
  typeId: string,
  locale: string,
): string {
  const type = types.find((pt) => pt.id === typeId);
  if (!type) return typeId;
  return i18nField(type, "name", locale) || typeId;
}
