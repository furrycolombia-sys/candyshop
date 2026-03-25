"use client";

/* eslint-disable react/no-multi-comp -- GalleryItemEditor is an internal compound component tightly coupled to SectionItemsGallery */

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control, UseFieldArrayReturn } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import { InlineAddButton } from "./InlineAddButton";
import { InlineRemoveButton } from "./InlineRemoveButton";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

type Lang = "en" | "es";

const I18N_NAMESPACE = "form.inlineEditor.sections";

/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
function GalleryItemEditor({
  sectionIndex,
  itemIndex,
  control,
  onRemove,
  dragProvided,
}: {
  sectionIndex: number;
  itemIndex: number;
  control: Control<ProductFormValues>;
  onRemove: () => void;
  dragProvided: DraggableProvided;
}) {
  const t = useTranslations(I18N_NAMESPACE);
  const [lang, setLang] = useState<Lang>("en");

  const titleField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.title_${lang}` as any,
  });
  const imageField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.image_url` as any,
  });

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  const imageUrl = String(imageField.field.value ?? "");

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative flex flex-col gap-2"
      {...tid(`section-${sectionIndex}-item-${itemIndex}`)}
    >
      {/* Remove */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={`Remove item ${itemIndex + 1}`}
      />

      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className="absolute left-1 top-1 z-10 cursor-grab rounded-sm bg-background/80 p-0.5 text-muted-foreground hover:text-foreground"
        aria-label={t("dragToReorder")}
      >
        <GripVertical className="size-3" />
      </div>

      {/* eslint-disable @next/next/no-img-element -- studio editor uses raw img for arbitrary user URLs */}
      {/* Image preview / placeholder — mirrors store GallerySection */}
      <div className="relative flex h-44 items-center justify-center overflow-hidden border-[3px] border-foreground bg-muted nb-shadow-sm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={String(titleField.field.value ?? "")}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-8 text-foreground/20" />
        )}
      </div>
      {/* eslint-enable @next/next/no-img-element */}

      {/* Image URL input */}
      <Input
        ref={imageField.field.ref}
        name={imageField.field.name}
        value={imageUrl}
        onChange={imageField.field.onChange}
        onBlur={imageField.field.onBlur}
        placeholder={t("imageUrl")}
        className="h-6 border-none bg-transparent p-0 text-[10px] text-muted-foreground shadow-none focus-visible:ring-0"
        {...tid(`section-item-image-${sectionIndex}-${itemIndex}`)}
      />

      {/* Lang toggle + caption */}
      <div className="flex items-center gap-1 px-1">
        <button
          type="button"
          onClick={toggleLang}
          className="shrink-0 rounded-sm border-2 border-foreground/30 px-1 py-0.5 font-display text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
          {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
        >
          {lang.toUpperCase()}
        </button>
        <Input
          ref={titleField.field.ref}
          name={titleField.field.name}
          value={String(titleField.field.value ?? "")}
          onChange={titleField.field.onChange}
          onBlur={titleField.field.onBlur}
          placeholder={`${t("itemTitle")} (${lang.toUpperCase()})`}
          className="h-auto flex-1 border-none bg-transparent p-0 text-xs font-medium text-muted-foreground shadow-none focus-visible:ring-0"
          {...tid(`section-item-title-${sectionIndex}-${itemIndex}`)}
        />
      </div>
    </div>
  );
  /* eslint-enable react-hooks/refs */
}
/* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

const ITEM_DROPPABLE_PREFIX = "section-items-";

interface SectionItemsGalleryProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  fieldArray: UseFieldArrayReturn;
  onAdd: () => void;
}

export function SectionItemsGallery({
  sectionIndex,
  control,
  fieldArray,
  onAdd,
}: SectionItemsGalleryProps) {
  const t = useTranslations(I18N_NAMESPACE);
  const { fields, remove } = fieldArray;

  return (
    <div className="flex flex-col gap-3 p-4">
      <Droppable
        droppableId={`${ITEM_DROPPABLE_PREFIX}${sectionIndex}`}
        type="ITEM"
      >
        {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {fields.map((field, itemIndex) => (
              <Draggable
                key={field.id}
                draggableId={field.id}
                index={itemIndex}
              >
                {(dragProvided) => (
                  <GalleryItemEditor
                    sectionIndex={sectionIndex}
                    itemIndex={itemIndex}
                    control={control}
                    onRemove={() => remove(itemIndex)}
                    dragProvided={dragProvided}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
        {/* eslint-enable sonarjs/no-nested-functions */}
      </Droppable>

      {fields.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {t("emptySection")}
        </p>
      )}

      <InlineAddButton label={t("addItem")} onClick={onAdd} />
    </div>
  );
}
