"use client";

import { X, ImageOff, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { tid } from "shared";
import { Button, Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface ImageUrlManagerProps {
  control: Control<ProductFormValues>;
}

export function ImageUrlManager({ control }: ImageUrlManagerProps) {
  const t = useTranslations("form.images");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "images",
  });

  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingAlt, setPendingAlt] = useState("");
  const [urlError, setUrlError] = useState("");
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  function handleAdd() {
    const trimmed = pendingUrl.trim();
    if (!trimmed) {
      setUrlError(t("urlRequired"));
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setUrlError(t("urlInvalid"));
      return;
    }

    append({
      url: trimmed,
      alt: pendingAlt.trim(),
      sort_order: fields.length,
    });
    setPendingUrl("");
    setPendingAlt("");
    setUrlError("");
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.delete(fields.length);
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleImageError(index: number) {
    setBrokenImages((prev) => new Set(prev).add(index));
  }

  function handleImageLoad(index: number) {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4" {...tid("image-url-manager")}>
      {/* Image grid */}
      {fields.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="relative rounded-lg border-3 border-foreground bg-muted nb-shadow-sm overflow-hidden"
              {...tid(`image-card-${index}`)}
            >
              {/* Sort order badge */}
              <span className="absolute left-1.5 top-1.5 z-10 flex size-5 items-center justify-center rounded-full border-2 border-foreground bg-background font-display text-[10px] font-extrabold">
                {index + 1}
              </span>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full border-2 border-foreground bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                aria-label={t("remove")}
                {...tid(`remove-image-${index}`)}
              >
                <X className="size-3" />
              </button>

              {/* Image preview */}
              <div className="flex h-24 items-center justify-center overflow-hidden bg-muted">
                {brokenImages.has(index) ? (
                  <div className="flex flex-col items-center gap-1 p-2 text-center text-muted-foreground">
                    <ImageOff className="size-6" />
                    <span className="break-all text-[9px] leading-tight opacity-70">
                      {field.url}
                    </span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/no-noninteractive-element-interactions -- user-supplied URLs need <img>; onError/onLoad are load events not user interactions
                  <img
                    src={field.url}
                    alt={field.alt || t("previewAlt")}
                    className="size-full object-cover"
                    onError={() => handleImageError(index)}
                    onLoad={() => handleImageLoad(index)}
                  />
                )}
              </div>

              {/* Alt text */}
              {field.alt && (
                <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                  {field.alt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add image row */}
      <div className="rounded-lg border-3 border-dashed border-foreground/30 p-3">
        <p className="mb-2 font-display text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("addImage")}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={pendingUrl}
              onChange={(e) => {
                setPendingUrl(e.target.value);
                if (urlError) setUrlError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("urlPlaceholder")}
              aria-label={t("imageUrl")}
              aria-invalid={!!urlError}
              {...tid("input-image-url")}
            />
            {urlError && (
              <span className="text-xs text-destructive">{urlError}</span>
            )}
          </div>
          <Input
            value={pendingAlt}
            onChange={(e) => setPendingAlt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("altPlaceholder")}
            aria-label={t("altText")}
            className="sm:w-48"
            {...tid("input-image-alt")}
          />
          <Button
            type="button"
            onClick={handleAdd}
            className="nb-btn nb-shadow-sm rounded-lg border-3 border-foreground bg-background px-4 py-2 hover:bg-muted"
            {...tid("add-image-btn")}
          >
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
