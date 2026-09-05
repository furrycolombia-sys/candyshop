"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";

import { usePendingOrderCount } from "@/features/orders/application/hooks/usePendingOrderCount";
import { ProductListPageContent } from "@/features/products/presentation/pages/ProductListPageContent";
import { useDelegateCountsByProduct } from "@/features/seller-admins/application/hooks/useDelegateCountsByProduct";
import { SELLER_ADMINS_READ_PERMISSION } from "@/features/seller-admins/domain/constants";
import { useCurrentUser } from "@/shared/application/hooks/useCurrentUser";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

/**
 * Studio's landing page.
 *
 * It lives in shared/presentation rather than features/products because it
 * composes three features: the product list, the pending-order count, and the
 * per-product delegate counts. Inside features/products those last two were
 * cross-feature imports, which the architecture rule forbids -- but the
 * imports were not the problem. A page that needs three features is a
 * composition root, and a feature is the wrong place for one.
 *
 * The route stays thin, as the rule asks: it renders this and nothing else.
 */
export function ProductListPage() {
  const { hasPermission } = useCurrentUserPermissions();
  const t = useTranslations("common");
  const { user } = useCurrentUser();
  const { data: delegateCounts } = useDelegateCountsByProduct(user?.id);
  const { data: pendingCount } = usePendingOrderCount();

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
