"use client";

/* eslint-disable react/no-multi-comp -- AccordionItemEditor is an internal compound component tightly coupled to SectionItemsAccordion */

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import { AutoTextarea } from "./AutoTextarea";
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

/* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
function AccordionItemEditor({
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
  const [open, setOpen] = useState(false);

  const titleField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.title_${lang}` as any,
  });
  const descField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.description_${lang}` as any,
  });

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative border-3 border-foreground nb-shadow-sm"
      {...tid(`section-${sectionIndex}-item-${itemIndex}`)}
    >
      {/* Remove */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={t("removeItem", { number: itemIndex + 1 })}
      />

      {/* Header row — mirrors store AccordionItem; pr-10 keeps +/- away from absolute X */}
      <div className="flex w-full items-center gap-2 p-5 pr-10">
        {/* Drag handle */}
        <div
          {...dragProvided.dragHandleProps}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={t("dragToReorder")}
        >
          <GripVertical className="size-4" />
        </div>

        {/* Lang toggle */}
        <button
          type="button"
          onClick={toggleLang}
          className="shrink-0 rounded-sm border-2 border-foreground/30 px-1.5 py-0.5 font-display text-tiny font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
          {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
        >
          {lang.toUpperCase()}
        </button>

        {/* Title input styled like the accordion question */}
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

        {/* Expand / collapse toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-expanded={open}
        >
          {open ? (
            <Minus className="size-5 shrink-0" />
          ) : (
            <Plus className="size-5 shrink-0" />
          )}
        </button>
      </div>

      {/* Expanded content — mirrors store AccordionItem answer area */}
      {open && (
        <div
          className={`border-t-3 border-foreground ${theme.bgLight} px-5 pb-5 pt-4`}
        >
          <AutoTextarea
            ref={descField.field.ref}
            name={descField.field.name}
            value={String(descField.field.value ?? "")}
            onChange={descField.field.onChange}
            onBlur={descField.field.onBlur}
            placeholder={`${t("itemDescription")} (${lang.toUpperCase()})`}
            className="resize-none border-none bg-transparent p-0 text-sm/relaxed text-muted-foreground shadow-none focus-visible:ring-0"
            {...tid(`section-item-desc-${sectionIndex}-${itemIndex}`)}
          />
        </div>
      )}
    </div>
  );
  /* eslint-enable react-hooks/refs */
}
/* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

interface SectionItemsAccordionProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  fieldArray: SectionFieldArray;
  onAdd: () => void;
}

export function SectionItemsAccordion({
  sectionIndex,
  control,
  theme,
  fieldArray,
  onAdd,
}: SectionItemsAccordionProps) {
  const t = useTranslations(SECTION_I18N_NAMESPACE);
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
            className="flex flex-col gap-3"
          >
            {fields.map((field, itemIndex) => (
              <Draggable
                key={field.id}
                draggableId={field.id}
                index={itemIndex}
              >
                {(dragProvided) => (
                  <AccordionItemEditor
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
