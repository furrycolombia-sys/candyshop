"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";

import { ProductTableRow } from "./ProductTableRow";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { useReorderProducts } from "@/features/products/application/useProductMutations";
import type { Product } from "@/features/products/domain/types";
import { useDelegateCountsByProduct } from "@/features/seller-admins/application/hooks/useDelegateCountsByProduct";

const ZEBRA_MODULO = 2;

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  /** When true, filters are active and drag-to-reorder is disabled */
  isFiltered: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageDelegates: boolean;
}

export function ProductTable({
  products,
  isLoading,
  isFiltered,
  canUpdate,
  canDelete,
  canManageDelegates,
}: ProductTableProps) {
  const t = useTranslations();
  const reorderMutation = useReorderProducts();
  const { user } = useSupabaseAuth();
  const { data: delegateCounts } = useDelegateCountsByProduct(user?.id);

  const canReorder = !isFiltered && products.length > 1;

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;

      // Build new order
      const reordered = [...products];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);

      // Compute new sortOrder values (1-based sequential)
      const updates = reordered.map((product, index) => ({
        id: product.id,
        sortOrder: index + 1,
      }));

      reorderMutation.mutate(updates);
    },
    [products, reorderMutation],
  );

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
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-strong border-dashed border-border bg-muted/30 py-16"
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
      className="overflow-x-auto rounded-xl border-strong border-border bg-background shadow-brutal-md"
      {...tid("product-table")}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <table className="w-full">
          <thead>
            <tr className="border-b-strong border-border bg-muted/50">
              {canReorder && (
                <th className="w-10 px-4 py-3 text-table-header">{""}</th>
              )}
              <th className="px-4 py-3 text-left text-table-header">{""}</th>
              <th className="px-4 py-3 text-left text-table-header">
                {t("products.name")}
              </th>
              <th className="px-4 py-3 text-left text-table-header">
                {t("products.type")}
              </th>
              <th className="px-4 py-3 text-left text-table-header">
                {t("products.category")}
              </th>
              <th className="px-4 py-3 text-right text-table-header">
                {t("products.price")}
              </th>
              <th className="px-4 py-3 text-center text-table-header">
                {t("products.active")}
              </th>
              <th className="px-4 py-3 text-center text-table-header">
                {t("products.featured")}
              </th>
              <th className="px-4 py-3 text-right text-table-header">
                {t("products.actions")}
              </th>
            </tr>
          </thead>
          <Droppable droppableId="product-table" isDropDisabled={!canReorder}>
            {}
            {(provided) => (
              <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {products.map((product, index) => (
                  <Draggable
                    key={product.id}
                    draggableId={product.id}
                    index={index}
                    isDragDisabled={!canReorder}
                  >
                    {(dragProvided, snapshot) => (
                      <ProductTableRow
                        product={product}
                        isOddRow={index % ZEBRA_MODULO === 1}
                        canReorder={canReorder}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        canManageDelegates={canManageDelegates}
                        dragProvided={dragProvided}
                        isDragging={snapshot.isDragging}
                        delegateCount={delegateCounts?.[product.id] ?? 0}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            )}
            {}
          </Droppable>
        </table>
      </DragDropContext>
    </div>
  );
}
