"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { tid } from "shared";
import type { ProductSection, ProductSectionItem } from "shared/types";
import { SECTION_TYPES } from "shared/types";
import { Input } from "ui";

import { ItemRow } from "./ItemRow";

interface SectionBlockProps {
  section: ProductSection;
  sectionIndex: number;
  onUpdate: (partial: Partial<ProductSection>) => void;
  onRemove: () => void;
  onUpdateItem: (
    itemIndex: number,
    partial: Partial<ProductSectionItem>,
  ) => void;
  onAddItem: () => void;
  onRemoveItem: (itemIndex: number) => void;
}

export function SectionBlock({
  section,
  sectionIndex,
  onUpdate,
  onRemove,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: SectionBlockProps) {
  const t = useTranslations("templates");
  const blockId = useId();

  return (
    <div
      className="flex flex-col gap-3 rounded-sm border-2 border-foreground/20 bg-muted/20 p-4"
      {...tid(`template-section-${String(sectionIndex)}`)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("sectionNameEn")}
            </label>
            <Input
              value={section.name_en}
              onChange={(e) => onUpdate({ name_en: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("sectionNameEs")}
            </label>
            <Input
              value={section.name_es}
              onChange={(e) => onUpdate({ name_es: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("sectionType")}
            </label>
            <select
              value={section.type}
              onChange={(e) =>
                onUpdate({ type: e.target.value as ProductSection["type"] })
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
            >
              {SECTION_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeSection")}
          className="mt-5 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("items")}
          </span>
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 rounded-sm border border-foreground/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
            {...tid(`template-add-item-${String(sectionIndex)}`)}
          >
            <Plus className="size-3" />
            {t("addItem")}
          </button>
        </div>

        {section.items.map((item, iIdx) => (
          <ItemRow
            key={`${blockId}-item-${String(item.sort_order)}`}
            item={item}
            onUpdate={(partial) => onUpdateItem(iIdx, partial)}
            onRemove={() => onRemoveItem(iIdx)}
          />
        ))}
      </div>
    </div>
  );
}
