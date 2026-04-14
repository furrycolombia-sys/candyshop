"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";

import { useDelegatedOrders } from "@/features/seller-admins/application/hooks/useDelegatedOrders";
import { useDelegateOrderActions } from "@/features/seller-admins/application/hooks/useDelegateOrderActions";
import { useDelegationContext } from "@/features/seller-admins/application/hooks/useDelegationContext";
import type { DelegatedOrderContext } from "@/features/seller-admins/domain/types";
import { DelegatedOrderList } from "@/features/seller-admins/presentation/components/DelegatedOrderList";
import { DelegateOrderActions } from "@/features/seller-admins/presentation/components/DelegateOrderActions";

export function DelegatedOrdersPage() {
  const t = useTranslations("sellerAdmins");
  const {
    canApprove,
    canRequestProof,
    isLoading: ctxLoading,
  } = useDelegationContext();
  const { data: groups = [], isLoading: ordersLoading } = useDelegatedOrders();
  const actionMutation = useDelegateOrderActions();

  const handleApprove = useCallback(
    (orderId: string) => {
      actionMutation.mutate({ orderId, action: "approve" });
    },
    [actionMutation],
  );

  const handleRequestProof = useCallback(
    (orderId: string, sellerNote: string) => {
      actionMutation.mutate({
        orderId,
        action: "request_proof",
        seller_note: sellerNote,
      });
    },
    [actionMutation],
  );

  if (ctxLoading || ordersLoading) return null;

  return (
    <div
      {...tid("delegated-orders-page")}
      className="mx-auto w-full max-w-2xl space-y-6 p-6"
    >
      <h1 className="text-xl font-semibold">{t("delegatedOrders")}</h1>

      <DelegatedOrderList
        groups={
          groups as Array<{
            seller: DelegatedOrderContext;
            orders: Array<{
              id: string;
              payment_status: string;
              seller_note?: string | null;
              [key: string]: unknown;
            }>;
          }>
        }
        renderActions={(order, seller) => (
          <DelegateOrderActions
            orderId={order.id}
            canApprove={canApprove(seller.seller_id)}
            canRequestProof={canRequestProof(seller.seller_id)}
            onApprove={handleApprove}
            onRequestProof={handleRequestProof}
            isPending={actionMutation.isPending}
          />
        )}
      />
    </div>
  );
}
