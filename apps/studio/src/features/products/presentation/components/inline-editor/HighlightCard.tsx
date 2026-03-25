"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { tid } from "shared";

import { InlineRemoveButton } from "./InlineRemoveButton";

interface HighlightCardProps {
  dragProvided: DraggableProvided;
  field: { icon?: string; title_en: string; description_en?: string };
  index: number;
  onRemove: () => void;
  dragLabel: string;
  removeLabel: string;
}

export function HighlightCard({
  dragProvided,
  field,
  index,
  onRemove,
  dragLabel,
  removeLabel,
}: HighlightCardProps) {
  /* eslint-disable react-hooks/refs -- @hello-pangea/dnd render props pass ref-like objects that must be spread during render */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative flex w-56 shrink-0 flex-col gap-2 rounded-xl border-3 border-foreground bg-card p-4 nb-shadow-sm"
      {...tid(`highlight-card-${index}`)}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className="absolute left-1.5 top-1.5 text-muted-foreground hover:text-foreground"
        aria-label={dragLabel}
      >
        <GripVertical className="size-4" />
      </div>
      {/* eslint-enable react-hooks/refs */}

      {/* Remove */}
      <InlineRemoveButton onClick={onRemove} ariaLabel={removeLabel} />

      {/* Icon */}
      {field.icon && (
        <span className="text-center font-display text-2xl">{field.icon}</span>
      )}

      {/* Title */}
      <p className="text-center font-display text-sm font-bold uppercase tracking-wider">
        {field.title_en}
      </p>

      {/* Description */}
      {field.description_en && (
        <p className="text-center text-xs text-muted-foreground">
          {field.description_en}
        </p>
      )}
    </div>
  );
}
