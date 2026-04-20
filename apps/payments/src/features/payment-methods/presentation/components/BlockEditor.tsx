"use client";

import { useTranslations } from "next-intl";
import type React from "react";
import { Textarea } from "ui";

import { VideoBlockEditor } from "./VideoBlockEditor";

import type {
  DisplayBlock,
  DisplayBlockType,
  ImageBlock,
  LinkBlock,
  TextBlock,
  UrlBlock,
  VideoBlock,
} from "@/features/payment-methods/domain/types";

// ─── Neobrutalist input class ─────────────────────────────────────────────────

export const inputClass =
  "flex h-9 w-full border-strong border-foreground bg-background px-3 py-1 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand";

// ─── Block Editor ─────────────────────────────────────────────────────────────

interface BlockEditorProps {
  block: DisplayBlock;
  onChange: (block: DisplayBlock) => void;
}

type BlockEditorRenderer = (
  block: DisplayBlock,
  onChange: (block: DisplayBlock) => void,
  t: ReturnType<typeof useTranslations>,
  optionalLabel: string,
) => React.ReactElement;

const blockEditorRegistry: Record<DisplayBlockType, BlockEditorRenderer> = {
  text: (block, onChange, t) => {
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
          placeholder={`${t("contentEs")} (${t("optional")})`}
          value={b.content_es ?? ""}
          onChange={(e) =>
            onChange({ ...b, content_es: e.target.value || undefined })
          }
        />
      </div>
    );
  },
  image: (block, onChange, t, optionalLabel) => {
    const b = block as ImageBlock;
    return (
      <div className="flex flex-col gap-2">
        <input
          type="url"
          placeholder={t("imageUrl")}
          value={b.url}
          onChange={(e) => onChange({ ...b, url: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t("altTextEn")}
          value={b.alt_en ?? ""}
          onChange={(e) =>
            onChange({ ...b, alt_en: e.target.value || undefined })
          }
          className={inputClass}
        />
        <input
          type="text"
          placeholder={`${t("altTextEs")} (${optionalLabel})`}
          value={b.alt_es ?? ""}
          onChange={(e) =>
            onChange({ ...b, alt_es: e.target.value || undefined })
          }
          className={inputClass}
        />
      </div>
    );
  },
  video: (block, onChange) => {
    const b = block as VideoBlock;
    return <VideoBlockEditor block={b} onChange={onChange} />;
  },
  link: (block, onChange, t, optionalLabel) => {
    const b = block as LinkBlock;
    return (
      <div className="flex flex-col gap-2">
        <input
          type="url"
          placeholder={t("linkUrl")}
          value={b.url}
          onChange={(e) => onChange({ ...b, url: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t("linkLabelEn")}
          value={b.label_en}
          onChange={(e) => onChange({ ...b, label_en: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={`${t("linkLabelEs")} (${optionalLabel})`}
          value={b.label_es ?? ""}
          onChange={(e) =>
            onChange({ ...b, label_es: e.target.value || undefined })
          }
          className={inputClass}
        />
      </div>
    );
  },
  url: (block, onChange, t, optionalLabel) => {
    const b = block as UrlBlock;
    return (
      <div className="flex flex-col gap-2">
        <input
          type="url"
          placeholder={t("linkUrl")}
          value={b.url}
          onChange={(e) => onChange({ ...b, url: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder={t("linkLabelEn")}
          value={b.label_en ?? ""}
          onChange={(e) =>
            onChange({ ...b, label_en: e.target.value || undefined })
          }
          className={inputClass}
        />
        <input
          type="text"
          placeholder={`${t("linkLabelEs")} (${optionalLabel})`}
          value={b.label_es ?? ""}
          onChange={(e) =>
            onChange({ ...b, label_es: e.target.value || undefined })
          }
          className={inputClass}
        />
      </div>
    );
  },
};

export function BlockEditor({ block, onChange }: BlockEditorProps) {
  const t = useTranslations("paymentMethods");
  const optionalLabel = t("optional");
  const renderer = blockEditorRegistry[block.type];
  return renderer(block, onChange, t, optionalLabel);
}
