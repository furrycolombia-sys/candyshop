"use client";

import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useCallback } from "react";
import { tid } from "shared";

import { useOrderActions } from "@/features/received-orders/application/hooks/useOrderActions";
import { useReceivedOrders } from "@/features/received-orders/application/hooks/useReceivedOrders";
import { FILTER_STATUSES } from "@/features/received-orders/domain/constants";
import { receivedOrdersSearchParams } from "@/features/received-orders/domain/searchParams";
import type { SellerAction } from "@/features/received-orders/domain/types";
import { ReceivedOrderCard } from "@/features/received-orders/presentation/components/ReceivedOrderCard";

export function ReceivedOrdersPageContent() {
  const t = useTranslations("receivedOrders");
  const [params, setParams] = useQueryStates(receivedOrdersSearchParams);
  const activeFilter = params.filter;
  const { data: orders, isLoading } = useReceivedOrders(activeFilter);
  const { mutate: executeAction, isPending } = useOrderActions();

  const handleAction = useCallback(
    (orderId: string, action: SellerAction, note?: string) => {
      executeAction({ orderId, action, sellerNote: note });
    },
    [executeAction],
  );

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("received-orders-page")}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("received-orders-title")}
          >
            {t("title")}
          </h1>
        </header>

        <div
          className="flex flex-wrap items-center gap-2"
          {...tid("received-orders-filters")}
        >
          {FILTER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setParams({ filter: status }, { history: "push" })}
              className={`rounded-lg border-strong border-foreground px-3 py-1 font-display text-xs font-bold uppercase tracking-wider transition-colors ${activeFilter === status ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}`}
              {...tid(`filter-${status}`)}
            >
              {t(`filters.${status}`)}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-4 border-foreground border-t-transparent" />
          </div>
        )}

        {!isLoading && (!orders || orders.length === 0) && (
          <div
            className="flex flex-col items-center justify-center gap-4 py-16 text-center"
            {...tid("received-orders-empty")}
          >
            <Package className="size-16 text-muted-foreground" />
            <h2 className="font-display text-xl font-extrabold uppercase">
              {t("noOrders")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("noOrdersHint")}</p>
          </div>
        )}

        {!isLoading && orders && orders.length > 0 && (
          <div className="flex flex-col gap-4" {...tid("received-orders-list")}>
            {orders.map((order) => (
              <ReceivedOrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
