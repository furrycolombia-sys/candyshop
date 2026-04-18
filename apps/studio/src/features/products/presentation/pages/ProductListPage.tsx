"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { usePendingOrderCount } from "@/features/orders/application/hooks/usePendingOrderCount";
import { ProductListPageContent } from "@/features/products/presentation/pages/ProductListPageContent";
import { useDelegateCountsByProduct } from "@/features/seller-admins/application/hooks/useDelegateCountsByProduct";
import { SELLER_ADMINS_READ_PERMISSION } from "@/features/seller-admins/domain/constants";
import { useSupabaseAuth } from "@/shared/application/hooks/useSupabaseAuth";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

export function ProductListPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");
  const { user } = useSupabaseAuth();
  const { data: delegateCounts } = useDelegateCountsByProduct(user?.id);
  const { data: pendingCount } = usePendingOrderCount();

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
      canManageDelegates={hasPermission(SELLER_ADMINS_READ_PERMISSION)}
      pendingCount={pendingCount}
      delegateCounts={delegateCounts ?? {}}
    />
  );
}
