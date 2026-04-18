"use client";

/* eslint-disable react/no-multi-comp -- TwoColumnRow is an internal compound component tightly coupled to SectionItemsTwoColumn */

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
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
const MODULO_ZEBRA = 2;

/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
function TwoColumnRow({
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

  const zebraClass =
    itemIndex % MODULO_ZEBRA === 0 ? theme.rowEven : theme.rowOdd;

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative flex items-stretch border-b-strong border-foreground last:border-b-0"
      style={{
        backgroundColor: zebraClass,
        ...dragProvided.draggableProps.style,
      }}
      {...tid(`section-${sectionIndex}-item-${itemIndex}`)}
    >
      {/* Remove */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={t("removeItem", { number: itemIndex + 1 })}
      />

      {/* Drag handle + lang toggle in label column */}
      <div className="flex w-1/3 shrink-0 items-center gap-1 border-r-3 border-foreground p-3">
        <div
          {...dragProvided.dragHandleProps}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={t("dragToReorder")}
        >
          <GripVertical className="size-3" />
        </div>

        <button
          type="button"
          onClick={toggleLang}
          className="shrink-0 rounded-sm border-2 border-foreground/30 px-1 py-0.5 font-display text-ui-xs font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
          {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
        >
          {lang.toUpperCase()}
        </button>

        {/* Label (title) */}
        <AutoTextarea
          ref={titleField.field.ref}
          name={titleField.field.name}
          value={String(titleField.field.value ?? "")}
          onChange={titleField.field.onChange}
          onBlur={titleField.field.onBlur}
          placeholder={`${t("itemTitle")} (${lang.toUpperCase()})`}
          className="flex-1 border-none bg-transparent p-0 text-sm font-bold uppercase tracking-wide shadow-none focus-visible:ring-0"
          {...tid(`section-item-title-${sectionIndex}-${itemIndex}`)}
        />
      </div>

      {/* Value (description) */}
      <div className="flex flex-1 items-center px-5 py-3">
        <AutoTextarea
          ref={descField.field.ref}
          name={descField.field.name}
          value={String(descField.field.value ?? "")}
          onChange={descField.field.onChange}
          onBlur={descField.field.onBlur}
          placeholder={`${t("itemDescription")} (${lang.toUpperCase()})`}
          className="w-full border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          {...tid(`section-item-desc-${sectionIndex}-${itemIndex}`)}
        />
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

interface SectionItemsTwoColumnProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  fieldArray: SectionFieldArray;
  onAdd: () => void;
}

export function SectionItemsTwoColumn({
  sectionIndex,
  control,
  theme,
  fieldArray,
  onAdd,
}: SectionItemsTwoColumnProps) {
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
            className="overflow-hidden border-strong shadow-brutal-sm"
            style={{ borderColor: theme.border }}
          >
            {fields.map((field, itemIndex) => (
              <Draggable
                key={field.id}
                draggableId={field.id}
                index={itemIndex}
              >
                {(dragProvided) => (
                  <TwoColumnRow
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
