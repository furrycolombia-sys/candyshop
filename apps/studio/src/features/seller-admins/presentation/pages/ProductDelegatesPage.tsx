"use client";

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { useProductById } from "@/features/products/application/useProductForm";
import {
  useAddDelegate,
  useRemoveDelegate,
} from "@/features/seller-admins/application/hooks/useDelegateMutations";
import { useDelegates } from "@/features/seller-admins/application/hooks/useDelegates";
import type { DelegatePermission } from "@/features/seller-admins/domain/types";
import { AddDelegateForm } from "@/features/seller-admins/presentation/components/AddDelegateForm";
import { DelegateList } from "@/features/seller-admins/presentation/components/DelegateList";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

const SELLER_ADMINS_READ_PERMISSION = "seller_admins.read";

interface ProductDelegatesPageProps {
  productId: string;
}

export function ProductDelegatesPage({ productId }: ProductDelegatesPageProps) {
  const { isLoading: permLoading, hasPermission } = useCurrentUserPermissions();
  const { user } = useSupabaseAuth();
  const t = useTranslations("sellerAdmins");
  const tCommon = useTranslations("common");

  const sellerId = user?.id;
  const { data: product, isLoading: productLoading } =
    useProductById(productId);
  const { data: delegates = [], isLoading: delegatesLoading } = useDelegates(
    sellerId,
    productId,
  );
  const addMutation = useAddDelegate();
  const removeMutation = useRemoveDelegate();

  const handleAdd = useCallback(
    (adminUserId: string, permissions: DelegatePermission[]) => {
      if (!sellerId) return;
      addMutation.mutate({ sellerId, adminUserId, permissions, productId });
    },
    [sellerId, productId, addMutation],
  );

  const handleRemove = useCallback(
    (adminUserId: string) => {
      if (!sellerId) return;
      removeMutation.mutate({ sellerId, adminUserId, productId });
    },
    [sellerId, productId, removeMutation],
  );

  if (permLoading || delegatesLoading || productLoading) return null;

  if (!hasPermission(SELLER_ADMINS_READ_PERMISSION)) {
    return (
      <AccessDeniedState
        title={tCommon("accessDenied")}
        hint={tCommon("accessDeniedHint")}
      />
    );
  }

  const productName = product?.name_en ?? "";

  return (
    <div
      {...tid("product-delegates-page")}
      className="mx-auto w-full max-w-2xl space-y-6 p-6"
    >
      <h1 className="text-xl font-semibold">
        {t("title")} — {productName}
      </h1>

      <section>
        <h2 className="mb-3 text-base font-medium">{t("currentDelegates")}</h2>
        <DelegateList
          delegates={delegates}
          onRemove={handleRemove}
          isRemoving={removeMutation.isPending}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium">{t("addDelegate")}</h2>
        <AddDelegateForm
          onAdd={handleAdd}
          isAdding={addMutation.isPending}
          productId={productId}
        />
      </section>
    </div>
  );
}
