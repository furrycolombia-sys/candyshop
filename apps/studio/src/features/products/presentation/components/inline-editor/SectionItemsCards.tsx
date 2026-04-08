"use client";

/* eslint-disable react/no-multi-comp -- CardItem is an internal compound component tightly coupled to SectionItemsCards */

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import { AutoTextarea } from "./AutoTextarea";
import { IconPicker } from "./IconPicker";
import { InlineAddButton } from "./InlineAddButton";
import { InlineRemoveButton } from "./InlineRemoveButton";
import type { SectionFieldArray } from "./sectionItemTypes";

import { useLangToggle } from "@/features/products/application/useLangToggle";
import {
  ITEM_DROPPABLE_PREFIX,
  SECTION_I18N_NAMESPACE,
} from "@/features/products/domain/constants";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

interface SectionItemsCardsProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  fieldArray: SectionFieldArray;
  onAdd: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */

function CardItem({
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
  const descField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.description_${lang}` as any,
  });
  const iconField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.icon` as any,
  });

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className={`relative flex w-56 shrink-0 flex-col gap-3 border-3 ${theme.border} bg-background p-5 nb-shadow-sm lg:w-auto`}
      {...tid(`section-${sectionIndex}-item-${itemIndex}`)}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className="absolute right-8 top-2 cursor-grab text-muted-foreground hover:text-foreground"
        aria-label={t("dragToReorder")}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Remove */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={t("removeItem", { number: itemIndex + 1 })}
      />

      {/* Icon picker */}
      <IconPicker
        value={String(iconField.field.value ?? "")}
        onChange={(name) => iconField.field.onChange(name)}
        themeBg={theme.bg}
      />

      {/* Lang toggle */}
      <button
        type="button"
        onClick={toggleLang}
        className="w-fit shrink-0 rounded-sm border-2 border-foreground/30 px-1.5 py-0.5 font-display text-tiny font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
        {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
      >
        {lang.toUpperCase()}
      </button>

      {/* Title */}
      <AutoTextarea
        ref={titleField.field.ref}
        name={titleField.field.name}
        value={String(titleField.field.value ?? "")}
        onChange={titleField.field.onChange}
        onBlur={titleField.field.onBlur}
        placeholder={`${t("itemTitle")} (${lang.toUpperCase()})`}
        className="border-none bg-transparent p-0 font-display text-sm/tight font-extrabold uppercase tracking-wide shadow-none focus-visible:ring-0 hover:border-dashed hover:border-foreground/30"
        {...tid(`section-item-title-${sectionIndex}-${itemIndex}`)}
      />

      {/* Description */}
      <AutoTextarea
        ref={descField.field.ref}
        name={descField.field.name}
        value={String(descField.field.value ?? "")}
        onChange={descField.field.onChange}
        onBlur={descField.field.onBlur}
        placeholder={`${t("itemDescription")} (${lang.toUpperCase()})`}
        className="resize-none border-none bg-transparent p-0 text-xs/relaxed text-muted-foreground shadow-none focus-visible:ring-0"
        {...tid(`section-item-desc-${sectionIndex}-${itemIndex}`)}
      />
    </div>
  );
  /* eslint-enable react-hooks/refs */
}
/* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

export function SectionItemsCards({
  sectionIndex,
  control,
  theme,
  fieldArray,
  onAdd,
}: SectionItemsCardsProps) {
  const t = useTranslations(SECTION_I18N_NAMESPACE);
  const { fields, remove } = fieldArray;

  return (
    <div className="flex flex-col gap-3 p-4">
      <Droppable
        droppableId={`${ITEM_DROPPABLE_PREFIX}${sectionIndex}`}
        type="ITEM"
        direction="horizontal"
      >
        {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:pb-0"
          >
            {fields.map((field, itemIndex) => (
              <Draggable
                key={field.id}
                draggableId={field.id}
                index={itemIndex}
              >
                {(dragProvided) => (
                  <CardItem
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
