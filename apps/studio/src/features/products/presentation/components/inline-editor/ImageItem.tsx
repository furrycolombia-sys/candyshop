"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { GripVertical, ImageOff } from "lucide-react";
import { tid } from "shared";

import { InlineRemoveButton } from "./InlineRemoveButton";

interface ImageItemProps {
  dragProvided: DraggableProvided;
  field: { url: string; alt: string };
  index: number;
  isBroken: boolean;
  onError: () => void;
  onLoad: () => void;
  onRemove: () => void;
  dragLabel: string;
  removeLabel: string;
}

export function ImageItem({
  dragProvided,
  field,
  index,
  isBroken,
  onError,
  onLoad,
  onRemove,
  dragLabel,
  removeLabel,
}: ImageItemProps) {
  /* eslint-disable react-hooks/refs -- @hello-pangea/dnd render props pass ref-like objects that must be spread during render */
  return (
    <div
      ref={dragProvided.innerRef}
      {...dragProvided.draggableProps}
      className="relative flex items-center gap-2 overflow-hidden rounded-xl border-3 border-foreground bg-card nb-shadow-sm"
      {...tid(`image-item-${index}`)}
    >
      {/* Drag handle */}
      <div
        {...dragProvided.dragHandleProps}
        className="flex shrink-0 items-center justify-center px-1 text-muted-foreground hover:text-foreground"
        aria-label={dragLabel}
      >
        <GripVertical className="size-4" />
      </div>
      {/* eslint-enable react-hooks/refs */}

      {/* Preview */}
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-muted">
        {isBroken ? (
          <ImageOff className="size-6 text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs; onError/onLoad are load events
          <img
            src={field.url}
            alt={field.alt || removeLabel}
            className="size-full object-cover"
            onError={onError}
            onLoad={onLoad}
          />
        )}
      </div>

      {/* Alt text overlay */}
      <div className="flex-1 truncate px-2 py-1">
        <span className="font-display text-[10px] font-extrabold uppercase tracking-wider text-foreground/60">
          #{index + 1}
        </span>
        {field.alt && (
          <p className="truncate text-xs text-muted-foreground">{field.alt}</p>
        )}
      </div>

      {/* Remove */}
      <InlineRemoveButton onClick={onRemove} ariaLabel={removeLabel} />
    </div>
  );
}
