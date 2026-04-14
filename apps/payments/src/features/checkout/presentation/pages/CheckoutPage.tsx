"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { CheckoutPageContent } from "@/features/checkout/presentation/pages/CheckoutPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function CheckoutPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.create", "receipts.create"])) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return <CheckoutPageContent />;
}
