"use client";

/* eslint-disable i18next/no-literal-string -- register paths are not user-facing */
import { useTranslations } from "next-intl";
import type { Control, UseFieldArrayReplace } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface ImageEditBarProps {
  control: Control<ProductFormValues>;
  index: number;
  editing: boolean;
  onDone: () => void;
  replace: UseFieldArrayReplace<ProductFormValues, "images">;
}

export function ImageEditBar({
  control,
  index,
  editing,
  onDone,
  replace,
}: ImageEditBarProps) {
  const t = useTranslations("form.inlineEditor");
  const watchedImages = useWatch({ control, name: "images" });

  return (
    <div
      className={`border-strong border-foreground bg-background p-3 ${editing ? "" : "hidden"}`}
      {...tid("image-edit-bar")}
    >
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("editImageUrl")}
          </span>
          <Input
            placeholder={t("imageUrlPlaceholder")}
            aria-label={t("editImageUrl")}
            {...tid("image-edit-url")}
            {...control.register(`images.${index}.url`)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("editImageAlt")}
          </span>
          <Input
            placeholder={t("imageAltPlaceholder")}
            aria-label={t("editImageAlt")}
            {...tid("image-edit-alt")}
            {...control.register(`images.${index}.alt`)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              {...tid("image-edit-store-cover")}
              {...control.register(`images.${index}.is_store_cover`)}
            />
            <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("storeCover")}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={watchedImages?.[index]?.fit === "contain"}
              onChange={(e) => {
                const updated = (watchedImages ?? []).map((img, i) =>
                  i === index
                    ? {
                        ...img,
                        fit: e.target.checked
                          ? ("contain" as const)
                          : ("cover" as const),
                      }
                    : img,
                );
                replace(updated);
              }}
              {...tid("image-edit-fit")}
            />
            <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("fitContain")}
            </span>
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="button-brutal button-press-sm mt-3 w-full justify-center border-strong border-foreground bg-foreground py-1.5 font-display text-xs font-bold uppercase tracking-widest text-background"
        {...tid("image-edit-done")}
      >
        {t("doneEditing")}
      </button>
    </div>
  );
}
/* eslint-enable i18next/no-literal-string */
