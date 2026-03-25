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
import { Input, Textarea } from "ui";

import { FaqItem } from "./FaqItem";
import { InlineAddButton } from "./InlineAddButton";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlineFaqProps {
  control: Control<ProductFormValues>;
}

export function InlineFaq({ control }: InlineFaqProps) {
  const t = useTranslations("form.inlineEditor");

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "faq",
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingQEn, setPendingQEn] = useState("");
  const [pendingQEs, setPendingQEs] = useState("");
  const [pendingAEn, setPendingAEn] = useState("");
  const [pendingAEs, setPendingAEs] = useState("");

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      move(result.source.index, result.destination.index);
    },
    [move],
  );

  const handleToggle = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleAdd = useCallback(() => {
    const questionEn = pendingQEn.trim();
    if (!questionEn) return;

    append({
      question_en: questionEn,
      question_es: pendingQEs.trim(),
      answer_en: pendingAEn.trim(),
      answer_es: pendingAEs.trim(),
    });
    setPendingQEn("");
    setPendingQEs("");
    setPendingAEn("");
    setPendingAEs("");
    setShowAddForm(false);
  }, [pendingQEn, pendingQEs, pendingAEn, pendingAEs, append]);

  const handleShowAdd = useCallback(() => setShowAddForm(true), []);
  const handleHideAdd = useCallback(() => setShowAddForm(false), []);

  return (
    <section className="w-full" {...tid("inline-faq")}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-6 font-display text-lg font-extrabold uppercase tracking-wider">
          {t("sections.faq")}
        </h2>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="faq">
            {/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd requires render-prop pattern */}
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-3"
              >
                {fields.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(dragProvided) => (
                      <FaqItem
                        dragProvided={dragProvided}
                        field={field}
                        index={index}
                        isExpanded={expandedIndex === index}
                        onToggle={() => handleToggle(index)}
                        onRemove={() => remove(index)}
                        dragLabel={t("faq.drag")}
                        removeLabel={t("faq.remove")}
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

        {/* Add FAQ form / button */}
        <div className="mt-4">
          {showAddForm ? (
            <div className="flex flex-col gap-2 rounded-xl border-3 border-dashed border-foreground/30 p-4">
              <div className="flex gap-2">
                <Input
                  value={pendingQEn}
                  onChange={(e) => setPendingQEn(e.target.value)}
                  placeholder={t("faq.questionEnPlaceholder")}
                  aria-label={t("faq.questionEn")}
                  {...tid("inline-faq-question-en-input")}
                />
                <Input
                  value={pendingQEs}
                  onChange={(e) => setPendingQEs(e.target.value)}
                  placeholder={t("faq.questionEsPlaceholder")}
                  aria-label={t("faq.questionEs")}
                  {...tid("inline-faq-question-es-input")}
                />
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={pendingAEn}
                  onChange={(e) => setPendingAEn(e.target.value)}
                  placeholder={t("faq.answerEnPlaceholder")}
                  aria-label={t("faq.answerEn")}
                  rows={2}
                  {...tid("inline-faq-answer-en-input")}
                />
                <Textarea
                  value={pendingAEs}
                  onChange={(e) => setPendingAEs(e.target.value)}
                  placeholder={t("faq.answerEsPlaceholder")}
                  aria-label={t("faq.answerEs")}
                  rows={2}
                  {...tid("inline-faq-answer-es-input")}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="nb-btn flex-1 rounded-lg border-3 border-foreground bg-background px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider hover:bg-muted"
                  {...tid("inline-faq-add-confirm")}
                >
                  {t("faq.add")}
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
            <InlineAddButton label={t("faq.add")} onClick={handleShowAdd} />
          )}
        </div>
      </div>
    </section>
  );
}
