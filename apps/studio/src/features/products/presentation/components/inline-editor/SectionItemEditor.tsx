"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";
import { Input, Textarea } from "ui";

import { InlineRemoveButton } from "./InlineRemoveButton";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

type Lang = "en" | "es";

interface SectionItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  control: Control<ProductFormValues>;
  onRemove: () => void;
  dragProvided: DraggableProvided;
}

export function SectionItemEditor({
  sectionIndex,
  itemIndex,
  control,
  onRemove,
  dragProvided,
}: SectionItemEditorProps) {
  const t = useTranslations("form.inlineEditor.sections");
  const [lang, setLang] = useState<Lang>("en");

  /* eslint-disable @typescript-eslint/no-explicit-any, i18next/no-literal-string -- dynamic nested field paths from useFieldArray */
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
  const imageField = useController({
    control,
    name: `sections.${sectionIndex}.items.${itemIndex}.image_url` as any,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any, i18next/no-literal-string */

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  /* eslint-disable react-hooks/refs -- useController field refs must be spread during render for react-hook-form binding */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative flex gap-2 rounded-lg border-2 border-foreground/20 bg-card p-3"
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

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Language toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="shrink-0 rounded-sm border-2 border-foreground/30 px-1.5 py-0.5 font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
            {...tid(`section-item-lang-toggle-${sectionIndex}-${itemIndex}`)}
          >
            {lang.toUpperCase()}
          </button>

          {/* Title */}
          <Input
            ref={titleField.field.ref}
            name={titleField.field.name}
            value={String(titleField.field.value ?? "")}
            onChange={titleField.field.onChange}
            onBlur={titleField.field.onBlur}
            placeholder={`${t("itemTitle")} (${lang.toUpperCase()})`}
            className="h-7 border-none bg-transparent p-0 text-sm font-bold shadow-none focus-visible:ring-0"
            {...tid(`section-item-title-${sectionIndex}-${itemIndex}`)}
          />
        </div>

        {/* Description */}
        <Textarea
          ref={descField.field.ref}
          name={descField.field.name}
          value={String(descField.field.value ?? "")}
          onChange={descField.field.onChange}
          onBlur={descField.field.onBlur}
          placeholder={`${t("itemDescription")} (${lang.toUpperCase()})`}
          rows={2}
          className="min-h-0 resize-none border-none bg-transparent p-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
          {...tid(`section-item-desc-${sectionIndex}-${itemIndex}`)}
        />

        {/* Icon + Image URL row */}
        <div className="flex gap-2">
          <Input
            ref={iconField.field.ref}
            name={iconField.field.name}
            value={String(iconField.field.value ?? "")}
            onChange={iconField.field.onChange}
            onBlur={iconField.field.onBlur}
            placeholder={t("icon")}
            className="h-6 flex-1 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            {...tid(`section-item-icon-${sectionIndex}-${itemIndex}`)}
          />
          <Input
            ref={imageField.field.ref}
            name={imageField.field.name}
            value={String(imageField.field.value ?? "")}
            onChange={imageField.field.onChange}
            onBlur={imageField.field.onBlur}
            placeholder={t("imageUrl")}
            className="h-6 flex-1 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            {...tid(`section-item-image-${sectionIndex}-${itemIndex}`)}
          />
        </div>
      </div>

      {/* Remove button */}
      <InlineRemoveButton
        onClick={onRemove}
        ariaLabel={`Remove item ${itemIndex + 1}`}
      />
    </div>
  );
  /* eslint-enable react-hooks/refs */
}
