"use client";

/* eslint-disable react/no-multi-comp -- GalleryItemEditor is an internal compound component tightly coupled to SectionItemsGallery */

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import { AutoTextarea } from "./AutoTextarea";
import { InlineAddButton } from "./InlineAddButton";
import { InlineRemoveButton } from "./InlineRemoveButton";
import type { SectionFieldArray } from "./sectionItemTypes";

import { useLangToggle } from "@/features/products/application/hooks/useLangToggle";
import {
  ITEM_DROPPABLE_PREFIX,
  SECTION_I18N_NAMESPACE,
} from "@/features/products/domain/constants";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
function GalleryItemEditor({
  sectionIndex,
  itemIndex,
  control,
  theme,
  onRemove,
  dragProvided,
}: {
  sectionIndex: number;
  itemIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  onRemove: () => void;
  dragProvided: DraggableProvided;
}) {
  const t = useTranslations(SECTION_I18N_NAMESPACE);
  const { lang, toggleLang } = useLangToggle();

  const titleField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.title_${lang}` as any,
  });
  const imageField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.image_url` as any,
  });

  const imageUrl = String(imageField.field.value ?? "");

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="flex items-start gap-3 border-strong border-foreground bg-background p-3 shadow-brutal-sm"
      {...tid(`section-${sectionIndex}-item-${itemIndex}`)}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className="mt-1 shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label={t("dragToReorder")}
      >
        <GripVertical className="size-4" />
      </div>

      {/* eslint-disable @next/next/no-img-element -- studio editor uses raw img for arbitrary user URLs */}
      {/* Image thumbnail */}
      <div
        className="size-20 shrink-0 overflow-hidden border-strong border-foreground"
        style={{ backgroundColor: theme.bg }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={String(titleField.field.value ?? "")}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-5 text-foreground/20" />
          </div>
        )}
      </div>
      {/* eslint-enable @next/next/no-img-element */}

      {/* Fields */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Image URL input */}
        <AutoTextarea
          ref={imageField.field.ref}
          name={imageField.field.name}
          value={imageUrl}
          onChange={imageField.field.onChange}
          onBlur={imageField.field.onBlur}
          placeholder={t("imageUrl")}
          className="border-none bg-transparent p-0 text-ui-xs text-muted-foreground shadow-none focus-visible:ring-0"
          {...tid(`section-item-image-${sectionIndex}-${itemIndex}`)}
        />

        {/* Lang toggle + caption */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLang}
            className="shrink-0 rounded-sm border-2 border-foreground/30 px-1 py-0.5 font-display text-ui-xs font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
            {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
          >
            {lang.toUpperCase()}
          </button>
          <AutoTextarea
            ref={titleField.field.ref}
            name={titleField.field.name}
            value={String(titleField.field.value ?? "")}
            onChange={titleField.field.onChange}
            onBlur={titleField.field.onBlur}
            placeholder={`${t("itemTitle")} (${lang.toUpperCase()})`}
            className="flex-1 border-none bg-transparent p-0 text-xs font-medium text-muted-foreground shadow-none focus-visible:ring-0"
            {...tid(`section-item-title-${sectionIndex}-${itemIndex}`)}
          />
        </div>
      </div>

      {/* Remove */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={t("removeItem", { number: itemIndex + 1 })}
      />
    </div>
  );
  /* eslint-enable react-hooks/refs */
}
/* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

interface SectionItemsGalleryProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  fieldArray: SectionFieldArray;
  onAdd: () => void;
}

export function SectionItemsGallery({
  sectionIndex,
  control,
  theme,
  fieldArray,
  onAdd,
}: SectionItemsGalleryProps) {
  const t = useTranslations(SECTION_I18N_NAMESPACE);
  const { fields, remove } = fieldArray;

  return (
    <div className="flex flex-col gap-3 p-4">
      <Droppable
        droppableId={`${ITEM_DROPPABLE_PREFIX}${sectionIndex}`}
        type={`${ITEM_DROPPABLE_PREFIX}${sectionIndex}`}
      >
        {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col gap-2"
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
                    theme={theme}
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
