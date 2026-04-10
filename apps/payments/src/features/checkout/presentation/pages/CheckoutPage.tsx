"use client";

import { useCurrentUserPermissions } from "auth/client";

import { CheckoutPageContent } from "@/features/checkout/presentation/pages/CheckoutPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function CheckoutPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.create", "receipts.create"])) {
    return <AccessDeniedState />;
  }

  return <CheckoutPageContent />;
}
