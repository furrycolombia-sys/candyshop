"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { ReceivedOrdersPageContent } from "@/features/received-orders/presentation/pages/ReceivedOrdersPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function ReceivedOrdersPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.read", "orders.update", "receipts.read"])) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <ReceivedOrdersPageContent />;
}
