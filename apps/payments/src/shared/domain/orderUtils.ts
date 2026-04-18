import { i18nField } from "shared";

import type { OrderItem } from "@/shared/domain/types";

/** Resolve the display name for an order item using locale-aware field lookup */
export function getItemName(item: OrderItem, locale: string): string {
  return i18nField(item.metadata, "name", locale) || item.product_id;
}
