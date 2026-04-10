"use client";

import { useCurrentUserPermissions } from "auth/client";

import { ProductListPageContent } from "@/features/products/presentation/pages/ProductListPageContent";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function ProductListPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("products.read")) {
    return <AccessDeniedState />;
  }

  return (
    <ProductListPageContent
      canCreate={hasPermission("products.create")}
      canUpdate={hasPermission("products.update")}
      canDelete={hasPermission("products.delete")}
    />
  );
}
