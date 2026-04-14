"use client";

import { useLocale } from "next-intl";
import { i18nField, tid } from "shared";

import type { OrderItem } from "@/features/orders/domain/types";
import { formatCop } from "@/shared/application/utils/formatCop";

interface OrderItemsListProps {
  items: OrderItem[];
}

function getItemName(item: OrderItem, locale: string): string {
  return i18nField(item.metadata, "name", locale) || item.product_id;
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  const locale = useLocale();

  return (
    <ul className="space-y-1" {...tid("order-items-list")}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between text-sm">
          <span className="truncate">
            {getItemName(item, locale)}{" "}
            <span className="text-muted-foreground">x{item.quantity}</span>
          </span>
          <span className="ml-2 shrink-0 font-medium">
            {formatCop(item.unit_price_cop * item.quantity)}
          </span>
        </li>
      ))}
    </ul>
  );
}
