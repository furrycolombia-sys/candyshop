/* eslint-disable react/no-multi-comp */
"use client";

import { useCurrentUserPermissions } from "auth/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { tid } from "shared";
import { Button } from "ui";

import { PendingOrdersBadge } from "@/features/orders";
import { useProducts } from "@/features/products/application/useProducts";
import { productsSearchParams } from "@/features/products/domain/searchParams";
import { ProductFilters } from "@/features/products/presentation/components/ProductFilters";
import { ProductTable } from "@/features/products/presentation/components/ProductTable";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

function ProductListPageContent({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations();
  const [filters] = useQueryStates(productsSearchParams);
  const { data: products, isLoading } = useProducts(filters);
  const isFiltered = !!(filters.type || filters.category || filters.q);

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
      {...tid("product-list-page")}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1
              className="font-display text-4xl font-extrabold uppercase tracking-tight"
              {...tid("products-title")}
            >
              {t("products.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("products.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PendingOrdersBadge />
            {canCreate && (
              <Link href="/products/new">
                <Button
                  className="nb-btn nb-shadow-md nb-btn-press-sm rounded-xl border-3 bg-brand px-6 py-3 text-brand-foreground hover:bg-brand-hover"
                  {...tid("new-product-button")}
                >
                  <Plus className="size-5" />
                  {t("products.newProduct")}
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Filters */}
        <ProductFilters />

        {/* Table */}
        <ProductTable
          products={products ?? []}
          isLoading={isLoading}
          isFiltered={isFiltered}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </div>
    </main>
  );
}

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
