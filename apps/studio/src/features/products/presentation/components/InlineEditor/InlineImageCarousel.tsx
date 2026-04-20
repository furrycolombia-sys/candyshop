"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { GripVertical, ImageOff, Plus, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";
import { tid } from "shared";
import { cn } from "ui";

import { ImageEditBar } from "./ImageEditBar";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";

interface InlineImageCarouselProps {
  control: Control<ProductFormValues>;
}

export function InlineImageCarousel({ control }: InlineImageCarouselProps) {
  const t = useTranslations("form.inlineEditor");

  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: "images",
  });

  const category = useWatch({ control, name: "category" });
  const theme = getCategoryTheme(category);

  // fields holds IDs + initial values; watchedImages holds LIVE form values
  const watchedImages = useWatch({ control, name: "images" });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Keep activeIndex in bounds
  const safeIndex =
    fields.length === 0 ? -1 : Math.min(activeIndex, fields.length - 1);
  const activeField = safeIndex >= 0 ? fields[safeIndex] : undefined;

  // Use solid category background — no gradient, matches store display

  const thumbInactive =
    "border-foreground/20 bg-background hover:border-foreground";

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const from = result.source.index;
      const to = result.destination.index;
      move(from, to);
      // Update activeIndex to follow the moved item
      if (safeIndex === from) {
        setActiveIndex(to);
      } else if (from < safeIndex && to >= safeIndex) {
        setActiveIndex(safeIndex - 1);
      } else if (from > safeIndex && to <= safeIndex) {
        setActiveIndex(safeIndex + 1);
      }
    },
    [move, safeIndex],
  );

  const handleAdd = useCallback(() => {
    append({
      url: "",
      alt: "",
      sort_order: fields.length,
      is_cover: false,
      is_store_cover: false,
      fit: "cover",
    });
    setActiveIndex(fields.length);
    setIsEditingMain(true);
  }, [append, fields.length]);

  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
      setBrokenImages((prev) => {
        const next = new Set<number>();
        for (const i of prev) {
          if (i < index) next.add(i);
          else if (i > index) next.add(i - 1);
        }
        return next;
      });
      if (index <= safeIndex && safeIndex > 0) {
        setActiveIndex(safeIndex - 1);
      }
      setIsEditingMain(false);
    },
    [remove, safeIndex],
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

  const handleSetCover = useCallback(
    (index: number) => {
      const updated = (watchedImages ?? []).map((img, i) => ({
        ...img,
        is_cover: i === index,
      }));
      replace(updated);
    },
    [watchedImages, replace],
  );

  const toggleEditMain = useCallback(() => {
    setIsEditingMain((prev) => !prev);
  }, []);

  /* ---- Thumbnail placeholder (no URL or broken) ---- */
  const thumbPlaceholder = (index: number, isBroken: boolean) => {
    if (isBroken) {
      return <ImageOff className="size-5 text-muted-foreground" />;
    }
    return (
      <span className="px-0.5 text-center font-display text-ui-xs font-extrabold uppercase tracking-wide leading-tight">
        #{index + 1}
      </span>
    );
  };

  /* ---- Thumbnail content (shared renderer) ---- */
  const renderThumbContent = (
    field: (typeof fields)[number],
    index: number,
  ) => {
    const isActive = index === safeIndex;
    const activeCls = isActive
      ? "border-foreground shadow-brutal-sm"
      : thumbInactive;
    // Use live form value (watchedImages) instead of stale fields snapshot
    const liveUrl = watchedImages?.[index]?.url ?? field.url;
    const liveAlt = watchedImages?.[index]?.alt ?? field.alt;
    const hasUrl = liveUrl.trim().length > 0;
    const isBroken = brokenImages.has(index);

    return (
      <>
        <button
          type="button"
          onClick={() => {
            setActiveIndex(index);
            setIsEditingMain(false);
          }}
          className={cn(
            "flex items-center justify-center size-16 border-strong transition-all overflow-hidden",
            activeCls,
          )}
          style={isActive ? { backgroundColor: theme.bg } : undefined}
          aria-label={t("imageNumber", { number: index + 1 })}
        >
          {hasUrl && !isBroken ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs; onError/onLoad are load events
            <img
              src={liveUrl}
              alt={liveAlt || t("imageNumber", { number: index + 1 })}
              className="size-full object-cover"
              onError={() => handleImageError(index)}
              onLoad={() => handleImageLoad(index)}
            />
          ) : (
            thumbPlaceholder(index, isBroken)
          )}
        </button>

        {/* Remove button on hover */}
        <button
          type="button"
          onClick={() => handleRemove(index)}
          aria-label={t("removeImage")}
          className="absolute -top-1.5 -right-1.5 z-10 hidden group-hover:flex size-5 items-center justify-center rounded-full bg-foreground text-background"
          {...tid("image-thumb-remove")}
        >
          <X className="size-3" />
        </button>

        {/* Set as cover button */}
        <button
          type="button"
          onClick={() => handleSetCover(index)}
          aria-label={t("setAsCover")}
          className="absolute -bottom-1.5 -right-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-background border border-foreground/20"
          data-cover={watchedImages?.[index]?.is_cover ? "true" : "false"}
          {...tid(`image-thumb-cover-${String(index)}`)}
        >
          <Star
            data-filled={watchedImages?.[index]?.is_cover ?? false}
            className={cn(
              "size-3",
              watchedImages?.[index]?.is_cover
                ? "fill-current text-warning"
                : "text-muted-foreground",
            )}
          />
        </button>
      </>
    );
  };

  /* ---- Add button thumbnail ---- */
  const addButton = (
    <button
      type="button"
      onClick={handleAdd}
      className="flex items-center justify-center size-16 border-strong border-dashed border-foreground/40 transition-colors hover:border-foreground/70 text-muted-foreground hover:text-foreground shrink-0"
      aria-label={t("addImage")}
      {...tid("image-thumb-add")}
    >
      <Plus className="size-5" />
    </button>
  );

  /* ---- Main image placeholder (no URL or broken) ---- */
  const mainPlaceholder = () => {
    if (brokenImages.has(safeIndex)) {
      return <ImageOff className="relative size-16 text-foreground/20" />;
    }
    return (
      <span className="relative font-display text-4xl font-extrabold uppercase tracking-widest text-foreground/10 select-none text-center px-6">
        #{safeIndex + 1}
      </span>
    );
  };

  /* ---- Main image area ---- */
  const mainImage =
    fields.length === 0 ? (
      <button
        type="button"
        onClick={handleAdd}
        className="relative flex flex-1 aspect-square flex-col items-center justify-center gap-3 overflow-hidden border-strong border-dashed border-foreground/40"
        style={{ backgroundColor: theme.bg }}
        {...tid("image-gallery-main-empty")}
      >
        <Plus className="size-8 text-foreground/30" />
        <span className="font-display text-sm font-bold uppercase tracking-wider text-foreground/40">
          {t("addFirstImage")}
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={toggleEditMain}
        className="relative flex flex-1 aspect-square cursor-pointer items-center justify-center overflow-hidden border-strong border-foreground shadow-brutal-lg"
        style={{ backgroundColor: theme.bg }}
        {...tid("image-gallery-main")}
      >
        {(() => {
          const liveUrl =
            watchedImages?.[safeIndex]?.url ?? activeField?.url ?? "";
          const liveAlt =
            watchedImages?.[safeIndex]?.alt ?? activeField?.alt ?? "";
          const liveFit = watchedImages?.[safeIndex]?.fit ?? "cover";
          return (liveUrl.trim().length ?? 0) > 0 &&
            !brokenImages.has(safeIndex) ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs; onError/onLoad are load events
            <img
              src={liveUrl}
              alt={liveAlt}
              className={cn(
                "relative size-full",
                liveFit === "contain" ? "object-contain" : "object-cover",
              )}
              onError={() => handleImageError(safeIndex)}
              onLoad={() => handleImageLoad(safeIndex)}
            />
          ) : (
            mainPlaceholder()
          );
        })()}

        {/* Bottom bar: caption + counter */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between bg-foreground/70 px-3 py-1.5">
          {(watchedImages?.[safeIndex]?.alt ?? activeField?.alt) ? (
            <span className="text-ui-xs font-bold uppercase tracking-widest text-background truncate">
              {watchedImages?.[safeIndex]?.alt ?? activeField?.alt}
            </span>
          ) : (
            <span />
          )}
          {fields.length > 1 && (
            <span className="text-ui-xs font-bold text-background tracking-widest shrink-0 ml-2">
              {safeIndex + 1} / {fields.length}
            </span>
          )}
        </div>
      </button>
    );

  /* ---- Inline edit bar ---- */
  // Always render inputs so react-hook-form keeps values registered;
  // hide visually when not editing to prevent unmount clearing values.
  const editBar =
    safeIndex >= 0 ? (
      <ImageEditBar
        control={control}
        index={safeIndex}
        editing={isEditingMain}
        onDone={() => setIsEditingMain(false)}
        replace={replace}
      />
    ) : null;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className="w-full lg:w-3/5 shrink-0"
        {...tid("inline-image-carousel")}
      >
        {/* Desktop: thumbnails left + image right */}
        <div className="hidden lg:flex gap-3">
          {/* Vertical thumbnails — draggable */}
          <Droppable droppableId="images" direction="vertical">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-2 shrink-0"
                {...tid("image-gallery-thumbs")}
              >
                {fields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className="relative group flex items-center gap-1"
                        {...tid(`image-thumb-${String(index)}`)}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className="cursor-grab text-muted-foreground hover:text-foreground"
                          aria-label={t("dragToReorder")}
                        >
                          <GripVertical className="size-3" />
                        </div>
                        {renderThumbContent(field, index)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {addButton}
              </div>
            )}
          </Droppable>

          {/* Main image — fills remaining width */}
          {mainImage}
        </div>

        {/* Mobile: image on top, thumbnails below */}
        <div className="flex flex-col gap-3 lg:hidden">
          {mainImage}

          {/* Horizontal thumbnail row */}
          <div
            className="flex gap-2 overflow-x-auto"
            {...tid("image-gallery-thumbs-mobile")}
          >
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="relative group shrink-0"
                {...tid(`image-thumb-mobile-${String(index)}`)}
              >
                {renderThumbContent(field, index)}
              </div>
            ))}
            {addButton}
          </div>
        </div>

        {/* Edit bar — single instance, responsive (avoids duplicate register) */}
        <div className="mt-3">{editBar}</div>
      </div>
    </DragDropContext>
  );
}
