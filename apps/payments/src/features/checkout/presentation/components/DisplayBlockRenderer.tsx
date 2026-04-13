/* eslint-disable i18next/no-literal-string -- renderer uses internal/fallback text, not user-facing */
/* eslint-disable @next/next/no-img-element -- dynamic user-uploaded images, no Next.js Image optimization needed */
/* eslint-disable react/no-multi-comp -- BlockContent and ImageBlock are private helpers co-located with their parent */
"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { i18nField, tid } from "shared";

import type {
  DisplayBlock,
  ImageBlock,
  LinkBlock,
  TextBlock,
  UrlBlock,
  VideoBlock,
} from "@/features/payment-methods/domain/types";

interface DisplayBlockRendererProps {
  block: DisplayBlock;
}

export function DisplayBlockRenderer({ block }: DisplayBlockRendererProps) {
  const locale = useLocale();

  return (
    <div {...tid(`display-block-${block.id}`)}>
      <BlockContent block={block} locale={locale} />
    </div>
  );
}

function BlockContent({
  block,
  locale,
}: {
  block: DisplayBlock;
  locale: string;
}) {
  switch (block.type) {
    case "text": {
      const b = block as TextBlock;
      const content = i18nField(b, "content", locale) || b.content_en;
      return (
        <div className="whitespace-pre-wrap text-sm/relaxed">{content}</div>
      );
    }
    case "image": {
      const b = block as ImageBlock;
      const alt = i18nField(b, "alt", locale) || "";
      return <ImageBlock block={b} alt={alt} />;
    }
    case "video": {
      const b = block as VideoBlock;
      return (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={b.url}
            className="absolute inset-0 size-full rounded-lg border border-border"
            sandbox="allow-scripts allow-same-origin"
            allowFullScreen
            title="Video"
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

function ImageBlock({ block, alt }: { block: ImageBlock; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored || !block.url) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
        Image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is not a user interaction, it's an error handler
    <img
      src={block.url}
      alt={alt}
      className="max-w-full rounded-lg border border-border"
      onError={() => setErrored(true)}
    />
  );
}
