"use client";

import { type DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Switch } from "ui";

import { FIELD_TYPE_ICONS } from "@/features/payment-methods/domain/constants";
import type { FormField } from "@/features/payment-methods/domain/types";

const inputClass =
  "flex h-8 w-full border-strong border-foreground bg-background px-2 py-1 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand";

export interface FieldRowProps {
  field: FormField;
  onUpdate: (updated: FormField) => void;
  onRemove: (id: string) => void;
  dragProvided: DraggableProvided;
}

export function FieldRow({
  field,
  onUpdate,
  onRemove,
  dragProvided,
}: FieldRowProps) {
  const t = useTranslations("paymentMethods");
  const optionalLabel = t("optional");

  const { innerRef, draggableProps, dragHandleProps } = dragProvided;

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      className="flex gap-3 border-l-4 border-brand bg-muted/10 p-3"
      {...tid(`form-field-${field.id}`)}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab self-start pt-1 text-muted-foreground hover:text-foreground"
        aria-label={t("dragToReorder")}
      >
        <GripVertical className="size-4" />
      </div>

      {/* Field editor */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {/* Type badge + Required row */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 border-strong border-foreground bg-background px-2 py-0.5 text-xs font-bold uppercase tracking-wider shadow-brutal-sm">
            {(() => {
              const Icon = FIELD_TYPE_ICONS[field.type];
              return <Icon className="size-3" />;
            })()}
            {t(`fieldTypes.${field.type}`)}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <label className="font-display text-xs font-bold uppercase tracking-wider">
              {t("fieldRequired")}
            </label>
            <Switch
              checked={field.required}
              onCheckedChange={(checked: boolean) =>
                onUpdate({ ...field, required: checked })
              }
            />
          </div>
        </div>

        {/* Labels — 2-column grid on wider screens */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-bold uppercase tracking-wider">
              {t("fieldLabelEn")}
            </label>
            <input
              type="text"
              value={field.label_en}
              onChange={(e) => onUpdate({ ...field, label_en: e.target.value })}
              className={inputClass}
              placeholder={t("fieldLabelEn")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-bold uppercase tracking-wider">
              {t("fieldLabelEs")} ({optionalLabel})
            </label>
            <input
              type="text"
              value={field.label_es ?? ""}
              onChange={(e) =>
                onUpdate({ ...field, label_es: e.target.value || undefined })
              }
              className={inputClass}
              placeholder={`${t("fieldLabelEs")} (${optionalLabel})`}
            />
          </div>
        </div>

        {/* Placeholders — 2-column grid on wider screens */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("fieldPlaceholderEn")} ({optionalLabel})
            </label>
            <input
              type="text"
              value={field.placeholder_en ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...field,
                  placeholder_en: e.target.value || undefined,
                })
              }
              className={inputClass}
              placeholder={`${t("fieldPlaceholderEn")} (${optionalLabel})`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("fieldPlaceholderEs")} ({optionalLabel})
            </label>
            <input
              type="text"
              value={field.placeholder_es ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...field,
                  placeholder_es: e.target.value || undefined,
                })
              }
              className={inputClass}
              placeholder={`${t("fieldPlaceholderEs")} (${optionalLabel})`}
            />
          </div>
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="self-start rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={t("removeField")}
        {...tid(`form-field-remove-${field.id}`)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
