"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import { ImageItem } from "./ImageItem";
import { InlineAddButton } from "./InlineAddButton";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlineImageCarouselProps {
  control: Control<ProductFormValues>;
}

export function InlineImageCarousel({ control }: InlineImageCarouselProps) {
  const t = useTranslations("form.inlineEditor");

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingAlt, setPendingAlt] = useState("");
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      move(result.source.index, result.destination.index);
    },
    [move],
  );

  const handleAdd = useCallback(() => {
    const trimmed = pendingUrl.trim();
    if (!trimmed) return;

    append({
      url: trimmed,
      alt: pendingAlt.trim(),
      sort_order: fields.length,
    });
    setPendingUrl("");
    setPendingAlt("");
    setShowAddForm(false);
  }, [pendingUrl, pendingAlt, fields.length, append]);

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleImageError = useCallback((index: number) => {
    setBrokenImages((prev) => new Set(prev).add(index));
  }, []);

  const handleImageLoad = useCallback((index: number) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const handleRemoveImage = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove],
  );

  const handleShowAdd = useCallback(() => setShowAddForm(true), []);
  const handleHideAdd = useCallback(() => setShowAddForm(false), []);

  return (
    <div
      className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0"
      {...tid("inline-image-carousel")}
    >
      {fields.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border-3 border-dashed border-foreground/20 text-sm text-muted-foreground">
          {t("noImages")}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="images">
          {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-2"
            >
              {fields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(dragProvided) => (
                    <ImageItem
                      dragProvided={dragProvided}
                      field={field}
                      index={index}
                      isBroken={brokenImages.has(index)}
                      onError={() => handleImageError(index)}
                      onLoad={() => handleImageLoad(index)}
                      onRemove={() => handleRemoveImage(index)}
                      dragLabel={t("dragImage")}
                      removeLabel={t("removeImage")}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
          {/* eslint-enable sonarjs/no-nested-functions */}
        </Droppable>
      </DragDropContext>

      {/* Add image section */}
      {showAddForm ? (
        <div className="flex flex-col gap-2 rounded-xl border-3 border-dashed border-foreground/30 p-3">
          <Input
            value={pendingUrl}
            onChange={(e) => setPendingUrl(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder={t("imageUrlPlaceholder")}
            aria-label={t("addImage")}
            {...tid("inline-image-url-input")}
          />
          <Input
            value={pendingAlt}
            onChange={(e) => setPendingAlt(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder={t("imageAltPlaceholder")}
            aria-label={t("imageAltPlaceholder")}
            {...tid("inline-image-alt-input")}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="nb-btn flex-1 rounded-lg border-3 border-foreground bg-background px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-muted"
              {...tid("inline-image-add-confirm")}
            >
              {t("addImage")}
            </button>
            <button
              type="button"
              onClick={handleHideAdd}
              className="rounded-lg border-3 border-foreground/30 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
        </div>
      ) : (
        <InlineAddButton label={t("addImage")} onClick={handleShowAdd} />
      )}
    </div>
  );
}
