/* eslint-disable i18next/no-literal-string -- aria-labels and empty state text are UI chrome, not user-facing content */
/* eslint-disable react/no-multi-comp -- private helper components co-located with their parent */
"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";
import { Textarea } from "ui";

import type {
  DisplayBlock,
  DisplayBlockType,
  ImageBlock,
  LinkBlock,
  TextBlock,
  UrlBlock,
  VideoBlock,
} from "@/features/payment-methods/domain/types";
import { toYouTubeEmbedUrl } from "@/features/payment-methods/domain/youtubeEmbed";
interface DisplaySectionEditorProps {
  blocks: DisplayBlock[];
  onChange: (blocks: DisplayBlock[]) => void;
}

const BLOCK_TYPES: DisplayBlockType[] = [
  "text",
  "image",
  "video",
  "link",
  "url",
];

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

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...blocks];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const next = [...blocks];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4" {...tid("display-section-editor")}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
          {t("displaySection")}
        </h3>
        <AddBlockDropdown onAdd={addBlock} />
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No blocks yet. Add one above.
        </p>
      )}

      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="flex gap-2 rounded-lg border border-border bg-muted/20 p-3"
          {...tid(`display-block-${block.id}`)}
        >
          {/* Reorder */}
          <div className="flex flex-col gap-1 pt-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveUp(index)}
              className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Move block up"
              {...tid(`display-block-up-${block.id}`)}
            >
              <ChevronUp className="size-3" />
            </button>
            <button
              type="button"
              disabled={index === blocks.length - 1}
              onClick={() => moveDown(index)}
              className="rounded-sm p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Move block down"
              {...tid(`display-block-down-${block.id}`)}
            >
              <ChevronDown className="size-3" />
            </button>
          </div>

          {/* Block editor */}
          <div className="flex-1 min-w-0">
            <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              {t(`blockTypes.${block.type}`)}
            </p>
            <BlockEditor block={block} onChange={updateBlock} />
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeBlock(block.id)}
            className="self-start rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remove block"
            {...tid(`display-block-remove-${block.id}`)}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Add Block Dropdown ───────────────────────────────────────────────────────

function AddBlockDropdown({
  onAdd,
}: {
  onAdd: (type: DisplayBlockType) => void;
}) {
  const t = useTranslations("paymentMethods");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        {...tid("add-display-block")}
      >
        + {t("addBlock")}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-border bg-background shadow-md">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              {...tid(`add-block-type-${type}`)}
            >
              {t(`blockTypes.${type}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Block Editor ─────────────────────────────────────────────────────────────

function BlockEditor({
  block,
  onChange,
}: {
  block: DisplayBlock;
  onChange: (block: DisplayBlock) => void;
}) {
  const t = useTranslations("paymentMethods");

  switch (block.type) {
    case "text": {
      const b = block as TextBlock;
      return (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={3}
            placeholder={t("contentEn")}
            value={b.content_en}
            onChange={(e) => onChange({ ...b, content_en: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder={t("contentEs")}
            value={b.content_es ?? ""}
            onChange={(e) =>
              onChange({ ...b, content_es: e.target.value || undefined })
            }
          />
        </div>
      );
    }
    case "image": {
      const b = block as ImageBlock;
      return (
        <div className="flex flex-col gap-2">
          <input
            type="url"
            placeholder={t("imageUrl")}
            value={b.url}
            onChange={(e) => onChange({ ...b, url: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("altTextEn")}
            value={b.alt_en ?? ""}
            onChange={(e) =>
              onChange({ ...b, alt_en: e.target.value || undefined })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("altTextEs")}
            value={b.alt_es ?? ""}
            onChange={(e) =>
              onChange({ ...b, alt_es: e.target.value || undefined })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
      );
    }
    case "video": {
      const b = block as VideoBlock;
      return <VideoBlockEditor block={b} onChange={onChange} />;
    }
    case "link": {
      const b = block as LinkBlock;
      return (
        <div className="flex flex-col gap-2">
          <input
            type="url"
            placeholder={t("linkUrl")}
            value={b.url}
            onChange={(e) => onChange({ ...b, url: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("linkLabelEn")}
            value={b.label_en}
            onChange={(e) => onChange({ ...b, label_en: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("linkLabelEs")}
            value={b.label_es ?? ""}
            onChange={(e) =>
              onChange({ ...b, label_es: e.target.value || undefined })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
      );
    }
    case "url": {
      const b = block as UrlBlock;
      return (
        <div className="flex flex-col gap-2">
          <input
            type="url"
            placeholder={t("linkUrl")}
            value={b.url}
            onChange={(e) => onChange({ ...b, url: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("linkLabelEn")}
            value={b.label_en ?? ""}
            onChange={(e) =>
              onChange({ ...b, label_en: e.target.value || undefined })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
          <input
            type="text"
            placeholder={t("linkLabelEs")}
            value={b.label_es ?? ""}
            onChange={(e) =>
              onChange({ ...b, label_es: e.target.value || undefined })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>
      );
    }
  }
}

// ─── Video Block Editor ───────────────────────────────────────────────────────

function VideoBlockEditor({
  block,
  onChange,
}: {
  block: VideoBlock;
  onChange: (block: DisplayBlock) => void;
}) {
  const t = useTranslations("paymentMethods");
  const [rawUrl, setRawUrl] = useState(block.url);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleChange = (value: string) => {
    setRawUrl(value);
    if (!value.trim()) {
      setUrlError(null);
      onChange({ ...block, url: "" });
      return;
    }
    const embedUrl = toYouTubeEmbedUrl(value);
    if (embedUrl) {
      setUrlError(null);
      onChange({ ...block, url: embedUrl });
    } else {
      setUrlError(t("invalidYoutubeUrl"));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        type="url"
        placeholder={t("videoUrl")}
        value={rawUrl}
        onChange={(e) => handleChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
      />
      {urlError && <p className="text-xs text-destructive">{urlError}</p>}
    </div>
  );
}
