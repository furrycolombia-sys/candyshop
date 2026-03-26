"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { i18nField, tid } from "shared";
import type { ProductCategory, ProductType } from "shared/types";
import { Badge, Button, cn } from "ui";

import {
  useDeleteProduct,
  useToggleProduct,
} from "@/features/products/application/useProductMutations";
import {
  CATEGORY_COLOR_MAP,
  TYPE_COLOR_MAP,
} from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";

const BADGE_CLASS = "border-2 font-bold uppercase";
const SWITCH_CLASS =
  "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-border transition-colors";
const SWITCH_THUMB_CLASS =
  "pointer-events-none block size-4 rounded-full border border-border bg-background transition-transform";
const CELL_CLASS = "px-4 py-3";
const ACTION_BTN_CLASS = "border-2 border-border";
const SWITCH_ON_POSITION = "translate-x-5";
const SWITCH_OFF_POSITION = "translate-x-0.5";

interface ProductTableRowProps {
  product: Product;
  isOddRow: boolean;
  canReorder: boolean;
  dragProvided: DraggableProvided;
  isDragging: boolean;
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getFirstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      return String((first as { url: string }).url);
    }
  }
  return null;
}

export function ProductTableRow({
  product,
  isOddRow,
  canReorder,
  dragProvided,
  isDragging,
}: ProductTableRowProps) {
  const t = useTranslations();
  const locale = useLocale();
  const toggleMutation = useToggleProduct();
  const deleteMutation = useDeleteProduct();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const imageUrl = getFirstImage(product.images);
  const name = i18nField(
    product as unknown as Record<string, unknown>,
    "name",
    locale,
  );

  const handleToggle = useCallback(
    (field: "is_active" | "featured", currentValue: boolean) => {
      toggleMutation.mutate({ id: product.id, field, value: !currentValue });
    },
    [toggleMutation, product.id],
  );

  const handleDelete = useCallback(() => {
    setDeletingId(product.id);
  }, [product.id]);

  const confirmDelete = useCallback(() => {
    deleteMutation.mutate(product.id, {
      onSettled: () => setDeletingId(null),
    });
  }, [deleteMutation, product.id]);

  /* eslint-disable react-hooks/refs -- @hello-pangea/dnd requires ref access during render for drag-and-drop binding */
  return (
    <tr
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/30",
        isOddRow && "bg-muted/10",
        isDragging && "bg-muted shadow-lg",
      )}
      {...tid(`product-row-${product.id}`)}
    >
      {/* Drag handle */}
      {canReorder && (
        <td className={`${CELL_CLASS} w-10`}>
          <div
            {...dragProvided.dragHandleProps}
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label={t("products.dragToReorder")}
          >
            <GripVertical className="size-4" />
          </div>
        </td>
      )}

      {/* Thumbnail */}
      <td className={CELL_CLASS}>
        <div className="size-10 overflow-hidden rounded-lg border-2 border-border bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={40}
              height={40}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              {"--"}
            </div>
          )}
        </div>
      </td>

      {/* Name */}
      <td className={CELL_CLASS}>
        <span className="text-table-cell font-medium">{name}</span>
      </td>

      {/* Type */}
      <td className={CELL_CLASS}>
        <Badge
          variant="outline"
          className={cn(
            BADGE_CLASS,
            TYPE_COLOR_MAP[product.type as ProductType],
          )}
        >
          {t(`productTypes.${product.type}`)}
        </Badge>
      </td>

      {/* Category */}
      <td className={CELL_CLASS}>
        <Badge
          variant="outline"
          className={cn(
            BADGE_CLASS,
            CATEGORY_COLOR_MAP[product.category as ProductCategory],
          )}
        >
          {t(`categories.${product.category}`)}
        </Badge>
      </td>

      {/* Price */}
      <td className={`${CELL_CLASS} text-right`}>
        <span className="text-table-cell font-bold tabular-nums">
          {formatCOP(product.price_cop)}
        </span>
      </td>

      {/* Active toggle */}
      <td className={`${CELL_CLASS} text-center`}>
        <button
          type="button"
          onClick={() => handleToggle("is_active", product.is_active)}
          disabled={toggleMutation.isPending}
          className={cn(
            SWITCH_CLASS,
            product.is_active ? "bg-success" : "bg-muted",
          )}
          role="switch"
          aria-checked={product.is_active}
          {...tid(`toggle-active-${product.id}`)}
        >
          <span
            className={cn(
              SWITCH_THUMB_CLASS,
              product.is_active ? SWITCH_ON_POSITION : SWITCH_OFF_POSITION,
            )}
          />
        </button>
      </td>

      {/* Featured toggle */}
      <td className={`${CELL_CLASS} text-center`}>
        <button
          type="button"
          onClick={() => handleToggle("featured", product.featured)}
          disabled={toggleMutation.isPending}
          className={cn(
            SWITCH_CLASS,
            product.featured ? "bg-brand" : "bg-muted",
          )}
          role="switch"
          aria-checked={product.featured}
          {...tid(`toggle-featured-${product.id}`)}
        >
          <span
            className={cn(
              SWITCH_THUMB_CLASS,
              product.featured ? SWITCH_ON_POSITION : SWITCH_OFF_POSITION,
            )}
          />
        </button>
      </td>

      {/* Actions */}
      <td className={`${CELL_CLASS} text-right`}>
        <div className="flex items-center justify-end gap-2">
          <Link href={`/products/${product.id}`}>
            <Button
              variant="outline"
              size="sm"
              className={ACTION_BTN_CLASS}
              {...tid(`edit-product-${product.id}`)}
            >
              <Pencil className="size-3.5" />
              <span className="sr-only">{t("common.edit")}</span>
            </Button>
          </Link>

          {deletingId === product.id ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className={`${ACTION_BTN_CLASS} text-xs`}
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                {...tid(`confirm-delete-${product.id}`)}
              >
                {t("common.confirm")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`${ACTION_BTN_CLASS} text-xs`}
                onClick={() => setDeletingId(null)}
                {...tid(`cancel-delete-${product.id}`)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={`${ACTION_BTN_CLASS} text-destructive hover:bg-destructive/10`}
              onClick={handleDelete}
              {...tid(`delete-product-${product.id}`)}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">{t("common.delete")}</span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
  /* eslint-enable react-hooks/refs */
}
