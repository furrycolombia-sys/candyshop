"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import { HighlightCard } from "./HighlightCard";
import { InlineAddButton } from "./InlineAddButton";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlineHighlightsProps {
  control: Control<ProductFormValues>;
}

export function InlineHighlights({ control }: InlineHighlightsProps) {
  const t = useTranslations("form.inlineEditor");

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "highlights",
  });

  const addLabel = t("highlights.add");

  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingIcon, setPendingIcon] = useState("");
  const [pendingTitleEn, setPendingTitleEn] = useState("");
  const [pendingTitleEs, setPendingTitleEs] = useState("");
  const [pendingDescEn, setPendingDescEn] = useState("");
  const [pendingDescEs, setPendingDescEs] = useState("");

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      move(result.source.index, result.destination.index);
    },
    [move],
  );

  const handleAdd = useCallback(() => {
    const titleEn = pendingTitleEn.trim();
    if (!titleEn) return;

    append({
      icon: pendingIcon.trim(),
      title_en: titleEn,
      title_es: pendingTitleEs.trim(),
      description_en: pendingDescEn.trim(),
      description_es: pendingDescEs.trim(),
    });
    setPendingIcon("");
    setPendingTitleEn("");
    setPendingTitleEs("");
    setPendingDescEn("");
    setPendingDescEs("");
    setShowAddForm(false);
  }, [
    pendingIcon,
    pendingTitleEn,
    pendingTitleEs,
    pendingDescEn,
    pendingDescEs,
    append,
  ]);

  const handleShowAdd = useCallback(() => setShowAddForm(true), []);
  const handleHideAdd = useCallback(() => setShowAddForm(false), []);

  return (
    <section className="w-full" {...tid("inline-highlights")}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-6 font-display text-lg font-extrabold uppercase tracking-wider">
          {t("sections.highlights")}
        </h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="highlights" direction="horizontal">
            {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 overflow-x-auto pb-2"
              >
                {fields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(dragProvided) => (
                      <HighlightCard
                        dragProvided={dragProvided}
                        field={field}
                        index={index}
                        onRemove={() => remove(index)}
                        dragLabel={t("highlights.drag")}
                        removeLabel={t("highlights.remove")}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
            {/* eslint-enable sonarjs/no-nested-functions */}
          </Droppable>
        </DragDropContext>

        {/* Add highlight form / button */}
        <div className="mt-4">
          {showAddForm ? (
            <div className="flex max-w-md flex-col gap-2 rounded-xl border-3 border-dashed border-foreground/30 p-4">
              <Input
                value={pendingIcon}
                onChange={(e) => setPendingIcon(e.target.value)}
                placeholder={t("highlights.iconPlaceholder")}
                aria-label={t("highlights.icon")}
                {...tid("inline-highlight-icon-input")}
              />
              <div className="flex gap-2">
                <Input
                  value={pendingTitleEn}
                  onChange={(e) => setPendingTitleEn(e.target.value)}
                  placeholder={t("highlights.titleEnPlaceholder")}
                  aria-label={t("highlights.titleEn")}
                  {...tid("inline-highlight-title-en-input")}
                />
                <Input
                  value={pendingTitleEs}
                  onChange={(e) => setPendingTitleEs(e.target.value)}
                  placeholder={t("highlights.titleEsPlaceholder")}
                  aria-label={t("highlights.titleEs")}
                  {...tid("inline-highlight-title-es-input")}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={pendingDescEn}
                  onChange={(e) => setPendingDescEn(e.target.value)}
                  placeholder={t("highlights.descEnPlaceholder")}
                  aria-label={t("highlights.descriptionEn")}
                  {...tid("inline-highlight-desc-en-input")}
                />
                <Input
                  value={pendingDescEs}
                  onChange={(e) => setPendingDescEs(e.target.value)}
                  placeholder={t("highlights.descEsPlaceholder")}
                  aria-label={t("highlights.descriptionEs")}
                  {...tid("inline-highlight-desc-es-input")}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="nb-btn flex-1 rounded-lg border-3 border-foreground bg-background px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-muted"
                  {...tid("inline-highlight-add-confirm")}
                >
                  {addLabel}
                </button>
                <button
                  type="button"
                  onClick={handleHideAdd}
                  className="rounded-lg border-3 border-foreground/30 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              </div>
            </div>
          ) : (
            <InlineAddButton label={addLabel} onClick={handleShowAdd} />
          )}
        </div>
      </div>
    </section>
  );
}
