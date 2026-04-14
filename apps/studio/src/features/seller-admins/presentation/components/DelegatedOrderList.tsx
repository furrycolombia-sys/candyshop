"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Badge } from "ui";

import type { DelegatedOrderContext } from "@/features/seller-admins/domain/types";

const ORDER_ID_PREVIEW_LENGTH = 8;
const EMPTY_STATE_CLASS = "py-8 text-center text-muted-foreground";
const DELEGATED_ORDERS_LIST_TID = "delegated-orders-list";

interface DelegatedOrder {
  id: string;
  payment_status: string;
  seller_note?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- order shape varies
  [key: string]: any;
}

interface OrderGroup {
  seller: DelegatedOrderContext;
  orders: DelegatedOrder[];
}

interface DelegatedOrderListProps {
  groups: OrderGroup[];
  renderActions?: (
    order: DelegatedOrder,
    seller: DelegatedOrderContext,
  ) => React.ReactNode;
}

export function DelegatedOrderList({
  groups,
  renderActions,
}: DelegatedOrderListProps) {
  const t = useTranslations("sellerAdmins");

  if (groups.length === 0) {
    return (
      <div {...tid(DELEGATED_ORDERS_LIST_TID)} className={EMPTY_STATE_CLASS}>
        {t("noOrders")}
      </div>
    );
  }

  return (
    <div {...tid(DELEGATED_ORDERS_LIST_TID)} className="space-y-6">
      {groups.map((group) => (
        <div
          key={group.seller.seller_id}
          {...tid(`delegated-order-group-${group.seller.seller_id}`)}
          className="space-y-3"
        >
          <h3 className="text-base font-medium">
            {group.seller.seller_display_name ?? t("unknownSeller")}
          </h3>

          <div className="space-y-2">
            {group.orders.map((order) => (
              <div
                key={order.id}
                {...tid(`delegated-order-${order.id}`)}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {t("orderId")}: {order.id.slice(0, ORDER_ID_PREVIEW_LENGTH)}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {order.payment_status}
                  </Badge>
                  {order.seller_note && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {order.seller_note}
                    </p>
                  )}
                </div>
                {renderActions?.(order, group.seller)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
