"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { AssignedOrdersPageContent } from "@/features/assigned-orders/presentation/pages/AssignedOrdersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function AssignedOrdersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.approve", "orders.request_proof"], "any")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <AssignedOrdersPageContent />;
}
