/* eslint-disable i18next/no-literal-string -- aria-labels and empty state text are UI chrome, not user-facing content */
/* eslint-disable react/no-multi-comp -- FieldEditor is a private helper co-located with its parent */
"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Switch } from "ui";

import type {
  FormField,
  FormFieldType,
} from "@/features/payment-methods/domain/types";

interface FormSectionEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "number",
  "file",
  "textarea",
];

function createField(): FormField {
  return {
    id: crypto.randomUUID(),
    type: "text",
    label_en: "",
    required: true,
  };
}

interface FieldRowProps {
  field: FormField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updated: FormField) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

function FieldRow({
  field,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: FieldRowProps) {
  const t = useTranslations("paymentMethods");

  return (
    <div
      className="flex gap-2 rounded-lg border border-border bg-muted/20 p-3"
      {...tid(`form-field-${field.id}`)}
    >
      {/* Reorder */}
      <div className="flex flex-col gap-1 pt-1">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMoveUp(index)}
          className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Move field up"
          {...tid(`form-field-up-${field.id}`)}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMoveDown(index)}
          className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Move field down"
          {...tid(`form-field-down-${field.id}`)}
        >
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* Field editor */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Type selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {t("fieldType")}
          </label>
          <select
            value={field.type}
            onChange={(e) =>
              onUpdate({ ...field, type: e.target.value as FormFieldType })
            }
            className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`fieldTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Label EN */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {t("fieldLabelEn")}
          </label>
          <input
            type="text"
            value={field.label_en}
            onChange={(e) => onUpdate({ ...field, label_en: e.target.value })}
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
            placeholder={t("fieldLabelEn")}
          />
        </div>

        {/* Label ES */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {t("fieldLabelEs")}
          </label>
          <input
            type="text"
            value={field.label_es ?? ""}
            onChange={(e) =>
              onUpdate({ ...field, label_es: e.target.value || undefined })
            }
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
            placeholder={t("fieldLabelEs")}
          />
        </div>

        {/* Placeholder EN */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {t("fieldPlaceholderEn")}
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
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
            placeholder={t("fieldPlaceholderEn")}
          />
        </div>

        {/* Placeholder ES */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
            {t("fieldPlaceholderEs")}
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
            className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
            placeholder={t("fieldPlaceholderEs")}
          />
        </div>

        {/* Required toggle */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground w-16 shrink-0">
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

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="self-start rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove field"
        {...tid(`form-field-remove-${field.id}`)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function FormSectionEditor({
  fields,
  onChange,
}: FormSectionEditorProps) {
  const t = useTranslations("paymentMethods");

  const addField = () => {
    onChange([...fields, createField()]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const updateField = (updated: FormField) => {
    onChange(fields.map((f) => (f.id === updated.id ? updated : f)));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...fields];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const next = [...fields];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4" {...tid("form-section-editor")}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          {t("formSection")}
        </h3>
        <button
          type="button"
          onClick={addField}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          {...tid("add-form-field")}
        >
          + {t("addField")}
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No fields yet. Add one above.
        </p>
      )}

      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          field={field}
          index={index}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          onUpdate={updateField}
          onRemove={removeField}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      ))}
    </div>
  );
}
