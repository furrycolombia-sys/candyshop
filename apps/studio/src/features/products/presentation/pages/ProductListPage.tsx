"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { ProductListPageContent } from "@/features/products/presentation/pages/ProductListPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function ProductListPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");

  if (isLoading) return null;
  if (!hasPermission("products.read")) {
    return (
      <AccessDeniedState
        title={t("accessDenied")}
        hint={t("accessDeniedHint")}
      />
    );
  }

  return (
    <ProductListPageContent
      canCreate={hasPermission("products.create")}
      canUpdate={hasPermission("products.update")}
      canDelete={hasPermission("products.delete")}
      canManageDelegates={hasPermission("seller_admins.read")}
    />
  );
}
