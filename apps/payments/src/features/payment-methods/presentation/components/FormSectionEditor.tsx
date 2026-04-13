/* eslint-disable react-hooks/refs -- @hello-pangea/dnd requires ref access during render for drag-and-drop binding */
/* eslint-disable i18next/no-literal-string -- aria-labels and language code labels are UI chrome, not user-facing content */
/* eslint-disable react/no-multi-comp -- FieldEditor is a private helper co-located with its parent */
"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
  type DraggableProvided,
} from "@hello-pangea/dnd";
import {
  AlignLeft,
  ClipboardList,
  GripVertical,
  Hash,
  Mail,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
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

const FIELD_TYPE_ICONS: Record<FormFieldType, typeof Type> = {
  text: Type,
  email: Mail,
  number: Hash,
  file: Upload,
  textarea: AlignLeft,
};

function createField(type: FormFieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label_en: "",
    required: true,
  };
}

const inputClass =
  "flex h-8 w-full border-strong border-foreground bg-background px-2 py-1 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand";

interface FieldRowProps {
  field: FormField;
  onUpdate: (updated: FormField) => void;
  onRemove: (id: string) => void;
  dragProvided: DraggableProvided;
}

function FieldRow({ field, onUpdate, onRemove, dragProvided }: FieldRowProps) {
  const t = useTranslations("paymentMethods");
  const optionalLabel = t("optional");

  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="flex gap-3 border-l-4 border-brand bg-muted/10 p-3"
      {...tid(`form-field-${field.id}`)}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
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

  const addField = (type: FormFieldType) => {
    onChange([...fields, createField(type)]);
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const updateField = (updated: FormField) => {
    onChange(fields.map((f) => (f.id === updated.id ? updated : f)));
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;

      const reordered = [...fields];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      onChange(reordered);
    },
    [fields, onChange],
  );

  return (
    <div className="flex flex-col gap-4" {...tid("form-section-editor")}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider">
          {t("formSection")}
        </h3>
      </div>

      {/* Field type buttons row */}
      <div className="flex flex-wrap gap-2" {...tid("add-form-field")}>
        {(
          ["text", "email", "number", "file", "textarea"] as FormFieldType[]
        ).map((type) => {
          const Icon = FIELD_TYPE_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => addField(type)}
              className="button-brutal inline-flex items-center gap-1.5 border-strong border-foreground bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-brutal-sm hover:bg-muted"
              {...tid(`add-field-type-${type}`)}
            >
              <Icon className="size-3.5" />
              {t(`fieldTypes.${type}`)}
            </button>
          );
        })}
      </div>

      {fields.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 py-8 px-4">
          <ClipboardList className="size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">
            {t("emptyFormHint")}
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="form-fields">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-4"
            >
              {fields.map((field, index) => (
                <Draggable key={field.id} draggableId={field.id} index={index}>
                  {(dragProvided) => (
                    <FieldRow
                      field={field}
                      onUpdate={updateField}
                      onRemove={removeField}
                      dragProvided={dragProvided}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
