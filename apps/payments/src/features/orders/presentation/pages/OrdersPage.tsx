"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { OrdersPageContent } from "@/features/orders/presentation/pages/OrdersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function OrdersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) {
    return null;
  }

  if (!hasPermission("orders.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <OrdersPageContent />;
}
