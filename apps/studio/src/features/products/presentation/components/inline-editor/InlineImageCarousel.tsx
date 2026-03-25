"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ImageOff, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";

/** Rotation angles for placeholder gradient variety */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- CSS rotation values
const GRADIENT_ANGLES = [135, 225, 315, 45, 180] as const;

interface InlineImageCarouselProps {
  control: Control<ProductFormValues>;
}

/* eslint-disable i18next/no-literal-string -- register paths are not user-facing */
export function InlineImageCarousel({ control }: InlineImageCarouselProps) {
  const t = useTranslations("form.inlineEditor");

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "images",
  });

  const category = useWatch({ control, name: "category" });
  const theme = getCategoryTheme(category);

  const [activeIndex, setActiveIndex] = useState(0);
  const [editingMain, setEditingMain] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Keep activeIndex in bounds
  const safeIndex =
    fields.length === 0 ? -1 : Math.min(activeIndex, fields.length - 1);
  const activeField = safeIndex >= 0 ? fields[safeIndex] : undefined;

  const angle =
    GRADIENT_ANGLES[safeIndex >= 0 ? safeIndex % GRADIENT_ANGLES.length : 0];
  const gradientStyle = `linear-gradient(${String(angle)}deg, var(${theme.accent}), var(${theme.accent}) 60%, transparent)`;

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
    append({ url: "", alt: "", sort_order: fields.length });
    setActiveIndex(fields.length);
    setEditingMain(true);
  }, [append, fields.length]);

  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
      setBrokenImages((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      if (index <= safeIndex && safeIndex > 0) {
        setActiveIndex(safeIndex - 1);
      }
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

  const toggleEditMain = useCallback(() => {
    setEditingMain((prev) => !prev);
  }, []);

  /* ---- Thumbnail placeholder (no URL or broken) ---- */
  const thumbPlaceholder = (index: number, isBroken: boolean) => {
    if (isBroken) {
      return <ImageOff className="size-5 text-muted-foreground" />;
    }
    return (
      <span className="font-display text-[8px] font-extrabold uppercase tracking-wide leading-tight text-center px-0.5">
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
      ? `border-foreground ${theme.bg} nb-shadow-sm`
      : thumbInactive;
    const hasUrl = field.url.trim().length > 0;
    const isBroken = brokenImages.has(index);

    return (
      <>
        <button
          type="button"
          onClick={() => setActiveIndex(index)}
          className={`flex items-center justify-center size-16 border-[3px] transition-all overflow-hidden ${activeCls}`}
          aria-label={t("imageNumber", { number: index + 1 })}
        >
          {hasUrl && !isBroken ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs; onError/onLoad are load events
            <img
              src={field.url}
              alt={field.alt || t("imageNumber", { number: index + 1 })}
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
      </>
    );
  };

  /* ---- Add button thumbnail ---- */
  const addButton = (
    <button
      type="button"
      onClick={handleAdd}
      className="flex items-center justify-center size-16 border-[3px] border-dashed border-foreground/40 transition-colors hover:border-foreground/70 text-muted-foreground hover:text-foreground shrink-0"
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
        className={`relative flex-1 flex flex-col items-center justify-center gap-3 aspect-square border-[3px] border-dashed border-foreground/40 overflow-hidden ${theme.bg}`}
        style={{ backgroundImage: gradientStyle }}
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
        className={`relative flex-1 flex items-center justify-center aspect-square border-[3px] border-foreground nb-shadow-lg overflow-hidden ${theme.bg} cursor-pointer`}
        style={{ backgroundImage: gradientStyle }}
        {...tid("image-gallery-main")}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {(activeField?.url.trim().length ?? 0) > 0 &&
        !brokenImages.has(safeIndex) ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs; onError/onLoad are load events
          <img
            src={activeField?.url}
            alt={activeField?.alt ?? ""}
            className="relative size-full object-contain"
            onError={() => handleImageError(safeIndex)}
            onLoad={() => handleImageLoad(safeIndex)}
          />
        ) : (
          mainPlaceholder()
        )}

        {/* Counter */}
        <div className="absolute bottom-2 right-2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 tracking-widest">
          {safeIndex + 1} / {fields.length}
        </div>
      </button>
    );

  /* ---- Inline edit bar ---- */
  const editBar =
    editingMain && safeIndex >= 0 ? (
      <div
        className="flex flex-col gap-2 border-[3px] border-foreground p-3"
        {...tid("image-edit-bar")}
      >
        <Input
          placeholder={t("imageUrlPlaceholder")}
          aria-label={t("editImageUrl")}
          {...tid("image-edit-url")}
          {...control.register(`images.${safeIndex}.url`)}
        />
        <Input
          placeholder={t("imageAltPlaceholder")}
          aria-label={t("editImageAlt")}
          {...tid("image-edit-alt")}
          {...control.register(`images.${safeIndex}.alt`)}
        />
      </div>
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
                        {...dragProvided.dragHandleProps}
                        className="relative group"
                        {...tid(`image-thumb-${String(index)}`)}
                      >
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

        {/* Desktop: edit bar below */}
        <div className="hidden lg:block mt-3">{editBar}</div>

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

          {/* Mobile: edit bar below thumbnails */}
          {editBar}
        </div>
      </div>
    </DragDropContext>
  );
}
/* eslint-enable i18next/no-literal-string */
