/* eslint-disable @next/next/no-img-element -- dynamic user-uploaded images, no Next.js Image optimization needed */
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ImageBlock as ImageBlockType } from "@/shared/domain/PaymentMethodTypes";

interface ImageBlockProps {
  block: ImageBlockType;
  alt: string;
}

export function ImageBlock({ block, alt }: ImageBlockProps) {
  const [hasErrored, setHasErrored] = useState(false);
  const t = useTranslations("paymentMethods");

  if (hasErrored || !block.url) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
        {t("imageUnavailable")}
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is not a user interaction, it's an error handler
    <img
      src={block.url}
      alt={alt}
      className="max-w-full rounded-lg border border-border"
      onError={() => setHasErrored(true)}
    />
  );
}
