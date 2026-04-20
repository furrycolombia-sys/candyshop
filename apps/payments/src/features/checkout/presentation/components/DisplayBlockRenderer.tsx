/* eslint-disable react/no-multi-comp -- BlockContent is a private render-switch helper co-located with its parent */
"use client";

import { useLocale } from "next-intl";
import { i18nField, tid } from "shared";

import { ImageBlock } from "./ImageBlock";

import type {
  DisplayBlock,
  ImageBlock as ImageBlockType,
  LinkBlock,
  TextBlock,
  UrlBlock,
  VideoBlock,
} from "@/shared/domain/paymentMethodTypes";

interface DisplayBlockRendererProps {
  block: DisplayBlock;
}

interface BlockContentProps {
  block: DisplayBlock;
  locale: string;
}

export function DisplayBlockRenderer({ block }: DisplayBlockRendererProps) {
  const locale = useLocale();

  return (
    <div {...tid(`display-block-${block.id}`)}>
      <BlockContent block={block} locale={locale} />
    </div>
  );
}

function BlockContent({ block, locale }: BlockContentProps) {
  switch (block.type) {
    case "text": {
      const b = block as TextBlock;
      const content = i18nField(b, "content", locale) || b.content_en;
      return (
        <div className="whitespace-pre-wrap text-sm/relaxed">{content}</div>
      );
    }
    case "image": {
      const b = block as ImageBlockType;
      const alt = i18nField(b, "alt", locale) || "";
      return <ImageBlock block={b} alt={alt} />;
    }
    case "video": {
      const b = block as VideoBlock;
      return (
        <div className="relative w-full aspect-video">
          <iframe
            src={b.url}
            className="absolute inset-0 size-full rounded-lg border border-border"
            sandbox="allow-scripts allow-same-origin"
            allowFullScreen
            title="Video" // eslint-disable-line i18next/no-literal-string -- HTML accessibility attribute on iframe, not user-facing text
          />
        </div>
      );
    }
    case "link": {
      const b = block as LinkBlock;
      const label = i18nField(b, "label", locale) || b.label_en;
      return (
        <a
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>
      );
    }
    case "url": {
      const b = block as UrlBlock;
      const label = i18nField(b, "label", locale) || b.url;
      return (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <a
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-sm font-mono text-primary hover:underline"
          >
            {label}
          </a>
        </div>
      );
    }
  }
}
