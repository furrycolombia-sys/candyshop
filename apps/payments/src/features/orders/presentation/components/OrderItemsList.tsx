"use client";

import { useLocale } from "next-intl";
import { tid } from "shared";

import type { OrderItem } from "@/features/orders/domain/types";
import { formatPrice } from "@/shared/application/utils/formatPrice";
import { getItemName } from "@/shared/domain/orderUtils";

interface OrderItemsListProps {
  items: OrderItem[];
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
            {formatPrice(item.unit_price * item.quantity, item.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}
