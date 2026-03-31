"use client";

import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useMyOrders } from "@/features/orders/application/hooks/useMyOrders";
import type {
  CheckoutGroup,
  OrderWithItems,
} from "@/features/orders/domain/types";
import { OrderCard } from "@/features/orders/presentation/components/OrderCard";
import { appUrls } from "@/shared/infrastructure/config";

function groupByCheckoutSession(orders: OrderWithItems[]): CheckoutGroup[] {
  const map = new Map<string, OrderWithItems[]>();

  for (const order of orders) {
    const key = order.checkout_session_id ?? order.id;
    const group = map.get(key);
    if (group) {
      group.push(order);
    } else {
      map.set(key, [order]);
    }
  }

  return [...map.values()].map((groupOrders) => ({
    checkoutSessionId: groupOrders[0].checkout_session_id,
    createdAt: groupOrders[0].created_at,
    orders: groupOrders,
  }));
}

export function OrdersPage() {
  const t = useTranslations("orders");
  const { data: orders, isLoading } = useMyOrders();

  const groups = useMemo(() => groupByCheckoutSession(orders ?? []), [orders]);

  // Loading
  if (isLoading) {
    return (
      <main className="flex flex-1 justify-center surface-grid-dots p-4 pt-8">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  // Empty state
  if (!orders || orders.length === 0) {
    return (
      <main
        className="flex flex-1 items-center justify-center surface-grid-dots p-4"
        {...tid("orders-empty")}
      >
        <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 text-center sm:p-10">
          <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("noOrders")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("noOrdersHint")}
          </p>
          <a
            href={appUrls.store}
            className="button-brutal button-press-sm shadow-brutal-sm mt-6 inline-flex items-center gap-2 border-strong border-foreground bg-foreground px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-background"
            {...tid("orders-go-to-store")}
          >
            <ArrowLeft className="size-4" />
            {t("backToStore")}
          </a>
        </div>
      </main>
    );
  }

  // Orders list grouped by checkout session
  return (
    <main
      className="flex flex-1 justify-center surface-grid-dots p-4 pt-8"
      {...tid("orders-page")}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1
            className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl"
            {...tid("orders-title")}
          >
            {t("title")}
          </h1>
          <a
            href={appUrls.store}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            {...tid("orders-back-to-store")}
          >
            <ArrowLeft className="size-3" />
            {t("backToStore")}
          </a>
        </div>

        {/* Checkout session groups */}
        {groups.map((group) => (
          <section
            key={group.checkoutSessionId ?? group.orders[0].id}
            className="space-y-3"
          >
            {/* Group header with date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-display font-extrabold uppercase tracking-wider">
                {t("checkoutDate")}
              </span>
              <span>
                {new Date(group.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-muted-foreground/60">
                {t("sellers", { count: group.orders.length })}
              </span>
            </div>

            {/* Order cards */}
            {group.orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
