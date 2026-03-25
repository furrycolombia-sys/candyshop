"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical } from "lucide-react";
import { tid } from "shared";

import { InlineRemoveButton } from "./InlineRemoveButton";

interface FaqItemProps {
  dragProvided: DraggableProvided;
  field: { question_en: string; answer_en?: string };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  dragLabel: string;
  removeLabel: string;
}

export function FaqItem({
  dragProvided,
  field,
  index,
  isExpanded,
  onToggle,
  onRemove,
  dragLabel,
  removeLabel,
}: FaqItemProps) {
  /* eslint-disable react-hooks/refs -- @hello-pangea/dnd render props pass ref-like objects that must be spread during render */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative rounded-xl border-3 border-foreground bg-card nb-shadow-sm"
      {...tid(`faq-item-${index}`)}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Drag handle */}
        <div
          {...dragProvided.dragHandleProps}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={dragLabel}
        >
          <GripVertical className="size-4" />
        </div>
        {/* eslint-enable react-hooks/refs */}

        {/* Question (clickable to expand) */}
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center justify-between text-left"
          aria-expanded={isExpanded}
          {...tid(`faq-toggle-${index}`)}
        >
          <span className="font-display text-sm font-bold">
            {field.question_en || `Q${index + 1}`}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Remove (absolute) */}
        <InlineRemoveButton onClick={onRemove} ariaLabel={removeLabel} />
      </div>

      {/* Expanded answer */}
      {isExpanded && (
        <div className="border-t-2 border-foreground/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {field.answer_en || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
