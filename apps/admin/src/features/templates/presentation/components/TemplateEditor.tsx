"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { tid } from "shared";
import type { ProductSection, ProductSectionItem } from "shared/types";
import { Input } from "ui";

import { TEMPLATE_FORM_DEFAULTS } from "@/features/templates/domain/constants";
import type { TemplateFormValues } from "@/features/templates/domain/types";
import { SectionBlock } from "@/features/templates/presentation/components/SectionBlock";

interface TemplateEditorProps {
  initial?: TemplateFormValues;
  isSaving: boolean;
  onSave: (values: TemplateFormValues) => void;
  onCancel: () => void;
}

function createEmptyItem(sortOrder: number): ProductSectionItem {
  return {
    title_en: "",
    title_es: "",
    description_en: "",
    description_es: "",
    icon: "",
    sort_order: sortOrder,
  };
}

function createEmptySection(sortOrder: number): ProductSection {
  return {
    name_en: "",
    name_es: "",
    type: "cards",
    sort_order: sortOrder,
    items: [],
  };
}

export function TemplateEditor({
  initial,
  isSaving,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const t = useTranslations("templates");
  const [form, setForm] = useState<TemplateFormValues>(
    initial ?? TEMPLATE_FORM_DEFAULTS,
  );
  const editorId = useId();

  const updateField = <K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSection = useCallback(
    (index: number, partial: Partial<ProductSection>) => {
      setForm((prev) => {
        const sections = [...prev.sections];
        sections[index] = { ...sections[index], ...partial };
        return { ...prev, sections };
      });
    },
    [],
  );

  const removeSection = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  }, []);

  const updateItem = useCallback(
    (
      sectionIndex: number,
      itemIndex: number,
      partial: Partial<ProductSectionItem>,
    ) => {
      setForm((prev) => {
        const sections = [...prev.sections];
        const items = [...sections[sectionIndex].items];
        items[itemIndex] = { ...items[itemIndex], ...partial };
        sections[sectionIndex] = { ...sections[sectionIndex], items };
        return { ...prev, sections };
      });
    },
    [],
  );

  const addItem = useCallback((sectionIndex: number) => {
    setForm((prev) => {
      const sections = [...prev.sections];
      const items = [
        ...sections[sectionIndex].items,
        createEmptyItem(sections[sectionIndex].items.length + 1),
      ];
      sections[sectionIndex] = { ...sections[sectionIndex], items };
      return { ...prev, sections };
    });
  }, []);

  const removeItem = useCallback((sectionIndex: number, itemIndex: number) => {
    setForm((prev) => {
      const sections = [...prev.sections];
      const items = sections[sectionIndex].items.filter(
        (_, i) => i !== itemIndex,
      );
      sections[sectionIndex] = { ...sections[sectionIndex], items };
      return { ...prev, sections };
    });
  }, []);

  return (
    <div
      className="flex flex-col gap-6 border-strong border-foreground bg-background p-6 shadow-brutal-md"
      {...tid("template-editor")}
    >
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("nameEn")}
          </label>
          <Input
            value={form.name_en}
            onChange={(e) => updateField("name_en", e.target.value)}
            {...tid("template-name-en")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("nameEs")}
          </label>
          <Input
            value={form.name_es}
            onChange={(e) => updateField("name_es", e.target.value)}
            {...tid("template-name-es")}
          />
        </div>
      </div>

      {/* Description fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("descriptionEn")}
          </label>
          <Input
            value={form.description_en}
            onChange={(e) => updateField("description_en", e.target.value)}
            {...tid("template-desc-en")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-display text-xs font-bold uppercase tracking-wider">
            {t("descriptionEs")}
          </label>
          <Input
            value={form.description_es}
            onChange={(e) => updateField("description_es", e.target.value)}
            {...tid("template-desc-es")}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">
            {t("sections")}
          </h3>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                sections: [
                  ...prev.sections,
                  createEmptySection(prev.sections.length + 1),
                ],
              }))
            }
            className="flex items-center gap-1.5 rounded-sm border-2 border-foreground px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
            {...tid("template-add-section")}
          >
            <Plus className="size-3.5" />
            {t("newSection")}
          </button>
        </div>

        {form.sections.map((section, sIdx) => (
          <SectionBlock
            key={`${editorId}-section-${String(section.sort_order)}`}
            section={section}
            sectionIndex={sIdx}
            onUpdate={(partial) => updateSection(sIdx, partial)}
            onRemove={() => removeSection(sIdx)}
            onUpdateItem={(iIdx, partial) => updateItem(sIdx, iIdx, partial)}
            onAddItem={() => addItem(sIdx)}
            onRemoveItem={(iIdx) => removeItem(sIdx, iIdx)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t-2 border-foreground/10 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-sm border-2 border-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors hover:bg-muted"
          {...tid("template-cancel")}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="rounded-sm border-2 border-foreground bg-foreground px-5 py-2 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          {...tid("template-save")}
        >
          {isSaving ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}
