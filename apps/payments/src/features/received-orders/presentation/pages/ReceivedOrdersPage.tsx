"use client";

import { useCurrentUserPermissions } from "auth/client";

import { ReceivedOrdersPageContent } from "@/features/received-orders/presentation/pages/ReceivedOrdersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function ReceivedOrdersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.read", "orders.update", "receipts.read"])) {
    return <AccessDeniedState />;
  }

  return <ReceivedOrdersPageContent />;
}
