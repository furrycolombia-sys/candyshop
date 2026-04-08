"use client";

import { useCurrentUserPermissions } from "auth/client";
import { tid } from "shared";
import { Skeleton } from "ui";

import {
  productToFormValues,
  useInsertProduct,
  useProductById,
  useUpdateProduct,
} from "@/features/products/application/useProductForm";
import { InlineEditor } from "@/features/products/presentation/components/inline-editor";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

interface ProductFormPageProps {
  productId?: string;
}

export function ProductFormPage({ productId }: ProductFormPageProps) {
  const isEdit = !!productId;
  const { isLoading: permissionsLoading, hasPermission } =
    useCurrentUserPermissions();

  const { data: product, isLoading } = useProductById(productId);
  const insertMutation = useInsertProduct();
  const updateMutation = useUpdateProduct(productId ?? "");

  if (permissionsLoading) {
    return null;
  }

  if (
    (isEdit && !hasPermission("products.update")) ||
    (!isEdit && !hasPermission("products.create"))
  ) {
    return <AccessDeniedState />;
  }

  if (isEdit && isLoading) {
    return (
      <main className="flex flex-1 flex-col surface-grid-dots">
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
  const activeMutation = isEdit ? updateMutation : insertMutation;

  return (
    <main className="flex flex-1 flex-col" {...tid("product-form-page")}>
      <InlineEditor
        defaultValues={defaultValues}
        onSubmit={activeMutation.mutate}
        isSubmitting={activeMutation.isPending}
        isEdit={isEdit}
        mutationError={activeMutation.error}
      />
    </main>
  );
}
