"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { DraggableProvided } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import { useController, useFieldArray } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import { InlineAddButton } from "./InlineAddButton";
import { InlineRemoveButton } from "./InlineRemoveButton";
import { SectionItemEditor } from "./SectionItemEditor";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

const ITEM_DROPPABLE_PREFIX = "section-items-";

type Lang = "en" | "es";

/** Ref map so parent DragDropContext can call move on any section's items */
export type ItemMoveRegistry = Map<number, (from: number, to: number) => void>;

interface SectionCardProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  dragProvided: DraggableProvided;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  itemMoveRegistry: ItemMoveRegistry;
}

export function SectionCard({
  sectionIndex,
  control,
  dragProvided,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  itemMoveRegistry,
}: SectionCardProps) {
  const t = useTranslations("form.inlineEditor.sections");
  const [nameLang, setNameLang] = useState<Lang>("en");

  /* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    move: moveItem,
  } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.items` as any,
  });

  // Register this section's move function so the parent DragDropContext can call it
  useEffect(() => {
    itemMoveRegistry.set(sectionIndex, moveItem);
    return () => {
      itemMoveRegistry.delete(sectionIndex);
    };
  }, [sectionIndex, moveItem, itemMoveRegistry]);

  const nameField = useController({
    control,
    name: `sections.${sectionIndex}.name_${nameLang}` as any,
  });
  const typeField = useController({
    control,
    name: `sections.${sectionIndex}.type` as any,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

  const toggleNameLang = useCallback(() => {
    setNameLang((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  const handleAddItem = useCallback(() => {
    appendItem({
      title_en: "",
      title_es: "",
      description_en: "",
      description_es: "",
      icon: "",
      image_url: "",
      sort_order: itemFields.length,
    });
  }, [appendItem, itemFields.length]);

  const typeValue = String(typeField.field.value ?? "cards");

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative rounded-xl border-3 border-foreground bg-card nb-shadow-sm"
      {...tid(`section-card-${sectionIndex}`)}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 border-b-2 border-foreground/20 px-4 py-3">
        {/* Drag handle */}
        <div
          {...dragProvided.dragHandleProps}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
          aria-label={t("dragToReorder")}
        >
          <GripVertical className="size-5" />
        </div>

        {/* Language toggle for section name */}
        <button
          type="button"
          onClick={toggleNameLang}
          className="shrink-0 rounded-sm border-2 border-foreground/30 px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          {nameLang.toUpperCase()}
        </button>

        {/* Section name input */}
        <Input
          ref={nameField.field.ref}
          name={nameField.field.name}
          value={String(nameField.field.value ?? "")}
          onChange={nameField.field.onChange}
          onBlur={nameField.field.onBlur}
          placeholder={`${t("sectionName")} (${nameLang.toUpperCase()})`}
          className="h-8 flex-1 border-none bg-transparent p-0 font-display text-sm font-extrabold uppercase tracking-wider shadow-none focus-visible:ring-0"
          {...tid(`section-name-${sectionIndex}`)}
        />

        {/* Type selector */}
        <select
          value={typeValue}
          onChange={(e) =>
            typeField.field.onChange({ target: { value: e.target.value } })
          }
          className="h-7 w-32 rounded-sm border-2 border-foreground/30 bg-background px-2 text-xs text-foreground"
          {...tid(`section-type-${sectionIndex}`)}
        >
          <option value="cards">{t("typeCards")}</option>
          <option value="accordion">{t("typeAccordion")}</option>
          <option value="two-column">{t("typeTwoColumn")}</option>
          <option value="gallery">{t("typeGallery")}</option>
        </select>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-expanded={!isCollapsed}
          {...tid(`section-collapse-${sectionIndex}`)}
        >
          <ChevronDown
            className={`size-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
          />
        </button>

        {/* Remove section */}
        <InlineRemoveButton
          onClick={onRemove}
          ariaLabel={`Remove section ${sectionIndex + 1}`}
        />
      </div>
      {/* eslint-enable react-hooks/refs */}

      {/* Section items (collapsible) */}
      {!isCollapsed && (
        <div className="flex flex-col gap-3 p-4">
          <Droppable
            droppableId={`${ITEM_DROPPABLE_PREFIX}${sectionIndex}`}
            type="ITEM"
          >
            {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
            {(itemProvided) => (
              <div
                ref={itemProvided.innerRef}
                {...itemProvided.droppableProps}
                className="flex flex-col gap-2"
              >
                {itemFields.map((itemField, itemIndex) => (
                  <Draggable
                    key={itemField.id}
                    draggableId={itemField.id}
                    index={itemIndex}
                  >
                    {(itemDragProvided) => (
                      <SectionItemEditor
                        sectionIndex={sectionIndex}
                        itemIndex={itemIndex}
                        control={control}
                        onRemove={() => removeItem(itemIndex)}
                        dragProvided={itemDragProvided}
                      />
                    )}
                  </Draggable>
                ))}
                {itemProvided.placeholder}
              </div>
            )}
            {/* eslint-enable sonarjs/no-nested-functions */}
          </Droppable>

          {itemFields.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("emptySection")}
            </p>
          )}

          <InlineAddButton label={t("addItem")} onClick={handleAddItem} />
        </div>
      )}
    </div>
  );
}
