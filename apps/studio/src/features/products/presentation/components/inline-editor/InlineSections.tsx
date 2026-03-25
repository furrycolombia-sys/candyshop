"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { tid } from "shared";

import { InlineAddButton } from "./InlineAddButton";
import { SectionCard } from "./SectionCard";
import type { ItemMoveRegistry } from "./SectionCard";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

const SECTION_DROPPABLE_ID = "sections";
const ITEM_DROPPABLE_PREFIX = "section-items-";

interface InlineSectionsProps {
  control: Control<ProductFormValues>;
}

export function InlineSections({ control }: InlineSectionsProps) {
  const t = useTranslations("form.inlineEditor.sections");

  const {
    fields: sectionFields,
    append: appendSection,
    remove: removeSection,
    move: moveSection,
  } = useFieldArray({ control, name: "sections" });

  const [collapsedSections, setCollapsedSections] = useState<
    Record<number, boolean>
  >({});

  const itemMoveRegistry = useRef<ItemMoveRegistry>(new Map());

  const toggleCollapse = useCallback((index: number) => {
    setCollapsedSections((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;

      // Section-level reorder
      if (
        source.droppableId === SECTION_DROPPABLE_ID &&
        destination.droppableId === SECTION_DROPPABLE_ID
      ) {
        moveSection(source.index, destination.index);
        return;
      }

      // Item-level reorder within a section
      if (
        source.droppableId.startsWith(ITEM_DROPPABLE_PREFIX) &&
        source.droppableId === destination.droppableId
      ) {
        const sectionIndex = Number(
          source.droppableId.slice(ITEM_DROPPABLE_PREFIX.length),
        );
        const moveFn = itemMoveRegistry.current.get(sectionIndex);
        moveFn?.(source.index, destination.index);
      }
    },
    [moveSection],
  );

  const handleAddSection = useCallback(() => {
    appendSection({
      name_en: "",
      name_es: "",
      type: "cards",
      sort_order: sectionFields.length,
      items: [],
    });
  }, [appendSection, sectionFields.length]);

  return (
    <section className="w-full" {...tid("inline-sections")}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-6 font-display text-lg font-extrabold uppercase tracking-wider">
          {t("title")}
        </h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={SECTION_DROPPABLE_ID} type="SECTION">
            {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-4"
              >
                {sectionFields.map((field, sectionIndex) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={sectionIndex}
                  >
                    {(dragProvided) => (
                      <SectionCard
                        sectionIndex={sectionIndex}
                        control={control}
                        dragProvided={dragProvided}
                        isCollapsed={!!collapsedSections[sectionIndex]}
                        onToggleCollapse={() => toggleCollapse(sectionIndex)}
                        onRemove={() => removeSection(sectionIndex)}
                        itemMoveRegistry={itemMoveRegistry.current}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
            {/* eslint-enable sonarjs/no-nested-functions */}
          </Droppable>

          {/* Empty state */}
          {sectionFields.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("emptySection")}
            </p>
          )}

          {/* Add Section button */}
          <div className="mt-4">
            <InlineAddButton
              label={t("addSection")}
              onClick={handleAddSection}
            />
          </div>
        </DragDropContext>
      </div>
    </section>
  );
}
