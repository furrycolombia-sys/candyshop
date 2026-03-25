"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { ProductTableRow } from "./ProductTableRow";

import type { Product } from "@/features/products/domain/types";

const TABLE_HEADER_CLASS = "text-table-header px-4 py-3";
const ZEBRA_MODULO = 2;

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductTable({ products, isLoading }: ProductTableProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed border-border bg-muted/30 py-16"
        {...tid("products-empty-state")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("products.noProducts")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("products.createFirst")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border-3 border-border bg-background nb-shadow-md"
      {...tid("product-table")}
    >
      <table className="w-full">
        <thead>
          <tr className="border-b-3 border-border bg-muted/50">
            <th className={`${TABLE_HEADER_CLASS} text-left`}>{""}</th>
            <th className={`${TABLE_HEADER_CLASS} text-left`}>
              {t("products.name")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-left`}>
              {t("products.type")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-left`}>
              {t("products.category")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-right`}>
              {t("products.price")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-center`}>
              {t("products.active")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-center`}>
              {t("products.featured")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-right`}>
              {t("products.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <ProductTableRow
              key={product.id}
              product={product}
              isOddRow={index % ZEBRA_MODULO === 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
