"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";

import { FieldRow } from "./FieldRow";

import { FIELD_TYPE_ICONS } from "@/features/payment-methods/domain/constants";
import type {
  FormField,
  FormFieldType,
} from "@/features/payment-methods/domain/types";

interface FormSectionEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

function createField(type: FormFieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label_en: "",
    required: true,
  };
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
        {(["text", "email", "number", "textarea"] as FormFieldType[]).map(
          (type) => {
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
          },
        )}
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
