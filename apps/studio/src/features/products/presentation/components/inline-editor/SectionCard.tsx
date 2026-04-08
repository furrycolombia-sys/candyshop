"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";
import type { Control } from "react-hook-form";
import { useController, useFieldArray } from "react-hook-form";
import { tid } from "shared";

import { AutoTextarea } from "./AutoTextarea";
import { InlineRemoveButton } from "./InlineRemoveButton";
import { SectionItemsAccordion } from "./SectionItemsAccordion";
import { SectionItemsCards } from "./SectionItemsCards";
import { SectionItemsGallery } from "./SectionItemsGallery";
import { SectionItemsTwoColumn } from "./SectionItemsTwoColumn";
import type { SectionFieldArray } from "./sectionItemTypes";

import { useLangToggle } from "@/features/products/application/useLangToggle";
import { SECTION_I18N_NAMESPACE } from "@/features/products/domain/constants";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

/** Ref map so parent DragDropContext can call move on any section's items */
export type ItemMoveRegistry = Map<number, (from: number, to: number) => void>;

interface SectionCardProps {
  sectionIndex: number;
  control: Control<ProductFormValues>;
  theme: CategoryTheme;
  dragProvided: DraggableProvided;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRemove: () => void;
  itemMoveRegistry: ItemMoveRegistry;
}

export function SectionCard({
  sectionIndex,
  control,
  theme,
  dragProvided,
  isCollapsed,
  onToggleCollapse,
  onRemove,
  itemMoveRegistry,
}: SectionCardProps) {
  const t = useTranslations(SECTION_I18N_NAMESPACE);
  const { lang: nameLang, toggleLang: toggleNameLang } = useLangToggle();

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

  const handleAddItem = useCallback(() => {
    appendItem({
      title_en: "",
      title_es: "",
      description_en: "",
      description_es: "",
      icon: "sparkles",
      image_url: "",
      sort_order: itemFields.length,
    });
  }, [appendItem, itemFields.length]);

  const typeValue = String(typeField.field.value ?? "cards");

  /* Build the field array subset expected by type-specific item components.
   * Cast needed because useFieldArray's generic is widened by the dynamic `as any` path. */
  const fieldArray = {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    move: moveItem,
  } as unknown as SectionFieldArray;

  function renderItems() {
    const props = {
      sectionIndex,
      control,
      theme,
      fieldArray,
      onAdd: handleAddItem,
    };
    switch (typeValue) {
      case "accordion": {
        return <SectionItemsAccordion {...props} />;
      }
      case "two-column": {
        return <SectionItemsTwoColumn {...props} />;
      }
      case "gallery": {
        return <SectionItemsGallery {...props} />;
      }
      default: {
        return <SectionItemsCards {...props} />;
      }
    }
  }

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative rounded-xl border-strong border-foreground bg-card shadow-brutal-sm"
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
          className="shrink-0 rounded-sm border-2 border-foreground/30 px-1.5 py-0.5 font-display text-ui-xs font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          {nameLang.toUpperCase()}
        </button>

        {/* Section name input */}
        <AutoTextarea
          ref={nameField.field.ref}
          name={nameField.field.name}
          value={String(nameField.field.value ?? "")}
          onChange={nameField.field.onChange}
          onBlur={nameField.field.onBlur}
          placeholder={`${t("sectionName")} (${nameLang.toUpperCase()})`}
          className="flex-1 border-none bg-transparent p-0 font-display text-sm font-extrabold uppercase tracking-wider shadow-none focus-visible:ring-0"
          {...tid(`section-name-${sectionIndex}`)}
        />

        {/* Type selector */}
        <select
          value={typeValue}
          onChange={(e) => typeField.field.onChange(e.target.value)}
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
          ariaLabel={t("removeSection", { number: sectionIndex + 1 })}
        />
      </div>
      {/* eslint-enable react-hooks/refs */}

      {/* Section items (collapsible) — type-specific rendering */}
      {!isCollapsed && renderItems()}
    </div>
  );
}
