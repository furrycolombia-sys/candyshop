/* eslint-disable sonarjs/no-nested-functions -- @hello-pangea/dnd render props require nested function callbacks */
"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { FileText, GripVertical, Video, Image, Link, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";

import { BlockEditor } from "./BlockEditor";

import type {
  DisplayBlock,
  DisplayBlockType,
} from "@/features/payment-methods/domain/types";

interface DisplaySectionEditorProps {
  blocks: DisplayBlock[];
  onChange: (blocks: DisplayBlock[]) => void;
}

function createBlock(type: DisplayBlockType): DisplayBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "text": {
      return { id, type: "text", content_en: "" };
    }
    case "image": {
      return { id, type: "image", url: "" };
    }
    case "video": {
      return { id, type: "video", url: "" };
    }
    case "link": {
      return { id, type: "link", url: "", label_en: "" };
    }
    case "url": {
      return { id, type: "url", url: "" };
    }
  }
}

const BLOCK_TYPE_ICONS: Record<DisplayBlockType, typeof FileText> = {
  text: FileText,
  image: Image,
  video: Video,
  link: Link,
  url: Link,
};

export function DisplaySectionEditor({
  blocks,
  onChange,
}: DisplaySectionEditorProps) {
  const t = useTranslations("paymentMethods");

  const addBlock = (type: DisplayBlockType) => {
    onChange([...blocks, createBlock(type)]);
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const updateBlock = (updated: DisplayBlock) => {
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination || source.index === destination.index) return;

      const reordered = [...blocks];
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      onChange(reordered);
    },
    [blocks, onChange],
  );

  return (
    <div className="flex flex-col gap-4" {...tid("display-section-editor")}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider">
          {t("displaySection")}
        </h3>
      </div>

      {/* Block type buttons row */}
      <div className="flex flex-wrap gap-2" {...tid("add-display-block")}>
        {(["text", "image", "video", "link", "url"] as DisplayBlockType[]).map(
          (type) => {
            const Icon = BLOCK_TYPE_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="button-brutal inline-flex items-center gap-1.5 border-strong border-foreground bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-brutal-sm hover:bg-muted"
                {...tid(`add-block-type-${type}`)}
              >
                <Icon className="size-3.5" />
                {t(`blockTypes.${type}`)}
              </button>
            );
          },
        )}
      </div>

      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 py-8 px-4">
          <FileText className="size-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">
            {t("emptyDisplayHint")}
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="display-blocks">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-4"
            >
              {blocks.map((block, index) => (
                <Draggable key={block.id} draggableId={block.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className="flex gap-3 border-l-4 border-brand bg-muted/10 p-3"
                      {...tid(`display-block-${block.id}`)}
                    >
                      {/* Drag handle */}
                      <div
                        {...dragProvided.dragHandleProps}
                        className="cursor-grab self-start pt-1 text-muted-foreground hover:text-foreground"
                        aria-label={t("dragToReorder")}
                      >
                        <GripVertical className="size-4" />
                      </div>

                      {/* Block editor */}
                      <div className="flex-1 min-w-0">
                        <p className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-brand">
                          {t(`blockTypes.${block.type}`)}
                        </p>
                        <BlockEditor block={block} onChange={updateBlock} />
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="self-start rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("removeBlock")}
                        {...tid(`display-block-remove-${block.id}`)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
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
