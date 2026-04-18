"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type {
  DisplayBlock,
  VideoBlock,
} from "@/features/payment-methods/domain/types";
import { toYouTubeEmbedUrl } from "@/features/payment-methods/domain/youtubeEmbed";

// ─── Neobrutalist input class ─────────────────────────────────────────────────

const inputClass =
  "flex h-9 w-full border-strong border-foreground bg-background px-3 py-1 text-sm shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-brand";

// ─── Video Block Editor ───────────────────────────────────────────────────────

interface VideoBlockEditorProps {
  block: VideoBlock;
  onChange: (block: DisplayBlock) => void;
}

export function VideoBlockEditor({ block, onChange }: VideoBlockEditorProps) {
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
        className={inputClass}
      />
      {urlError && <p className="text-xs text-destructive">{urlError}</p>}
    </div>
  );
}
