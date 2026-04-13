"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { PaymentMethodsPageContent } from "@/features/payment-methods/presentation/pages/PaymentMethodsPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function PaymentMethodsPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) return null;
  if (!hasPermission("seller_payment_methods.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return (
    <PaymentMethodsPageContent
      canCreate={hasPermission("seller_payment_methods.create")}
      canUpdate={hasPermission("seller_payment_methods.update")}
      canDelete={hasPermission("seller_payment_methods.delete")}
    />
  );
}
