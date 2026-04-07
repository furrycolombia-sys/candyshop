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

import { useReorderProducts } from "@/features/products/application/useProductMutations";
import type { Product } from "@/features/products/domain/types";

const TABLE_HEADER_CLASS = "text-table-header px-4 py-3";
const ZEBRA_MODULO = 2;

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  /** When true, filters are active and drag-to-reorder is disabled */
  isFiltered: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ProductTable({
  products,
  isLoading,
  isFiltered,
  canUpdate,
  canDelete,
}: ProductTableProps) {
  const t = useTranslations();
  const reorderMutation = useReorderProducts();

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
      <DragDropContext onDragEnd={handleDragEnd}>
        <table className="w-full">
          <thead>
            <tr className="border-b-3 border-border bg-muted/50">
              {canReorder && (
                <th className={`${TABLE_HEADER_CLASS} w-10`}>{""}</th>
              )}
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
                        dragProvided={dragProvided}
                        isDragging={snapshot.isDragging}
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
