"use client";
/* eslint-disable i18next/no-literal-string -- permission identifiers are internal keys */

import { useCurrentUserPermissions } from "auth/client";

import { PaymentMethodTypesPageContent } from "@/features/payment-method-types/presentation/pages/PaymentMethodTypesPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function PaymentMethodTypesPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("payment_method_types.read")) {
    return <AccessDeniedState />;
  }

  return (
    <PaymentMethodTypesPageContent
      canCreate={hasPermission("payment_method_types.create")}
      canUpdate={hasPermission("payment_method_types.update")}
      canDelete={hasPermission("payment_method_types.delete")}
    />
  );
}
