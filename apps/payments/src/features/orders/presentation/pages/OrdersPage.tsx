"use client";

import { useCurrentUserPermissions } from "auth/client";

import { OrdersPageContent } from "@/features/orders/presentation/pages/OrdersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function OrdersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) {
    return null;
  }

  if (!hasPermission("orders.read")) {
    return <AccessDeniedState />;
  }

  return <OrdersPageContent />;
}
