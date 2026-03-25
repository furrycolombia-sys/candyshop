"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton } from "ui";

import {
  productToFormValues,
  useInsertProduct,
  useProductById,
  useUpdateProduct,
} from "@/features/products/application/useProductForm";
import { ProductForm } from "@/features/products/presentation/components/ProductForm";

interface ProductFormPageProps {
  productId?: string;
}

export function ProductFormPage({ productId }: ProductFormPageProps) {
  const t = useTranslations();
  const isEdit = !!productId;

  const { data: product, isLoading } = useProductById(productId);
  const insertMutation = useInsertProduct();
  const updateMutation = useUpdateProduct(productId ?? "");

  if (isEdit && isLoading) {
    return (
      <main className="flex flex-1 flex-col bg-dots">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  const defaultValues = product ? productToFormValues(product) : undefined;

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
      {...tid("product-form-page")}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("form-page-title")}
          >
            {isEdit ? t("products.editProduct") : t("products.newProduct")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEdit ? t("form.subtitleEdit") : t("form.subtitleCreate")}
          </p>
        </header>

        {/* Form */}
        <ProductForm
          defaultValues={defaultValues}
          onSubmit={isEdit ? updateMutation.mutate : insertMutation.mutate}
          isSubmitting={insertMutation.isPending || updateMutation.isPending}
          isEdit={isEdit}
        />
      </div>
    </main>
  );
}
