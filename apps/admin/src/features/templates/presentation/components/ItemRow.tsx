"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductSectionItem } from "shared/types";
import { Input } from "ui";

interface ItemRowProps {
  item: ProductSectionItem;
  onUpdate: (partial: Partial<ProductSectionItem>) => void;
  onRemove: () => void;
}

export function ItemRow({ item, onUpdate, onRemove }: ItemRowProps) {
  const t = useTranslations("templates");
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_32px] gap-2 rounded-sm border border-foreground/10 bg-background p-2">
      <Input
        placeholder={t("itemTitleEn")}
        value={item.title_en}
        onChange={(e) => onUpdate({ title_en: e.target.value })}
      />
      <Input
        placeholder={t("itemTitleEs")}
        value={item.title_es}
        onChange={(e) => onUpdate({ title_es: e.target.value })}
      />
      <Input
        placeholder={t("itemDescEn")}
        value={item.description_en}
        onChange={(e) => onUpdate({ description_en: e.target.value })}
      />
      <Input
        placeholder={t("itemDescEs")}
        value={item.description_es}
        onChange={(e) => onUpdate({ description_es: e.target.value })}
      />
      <Input
        placeholder={t("itemIcon")}
        value={item.icon ?? ""}
        onChange={(e) => onUpdate({ icon: e.target.value })}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("removeItem")}
        className="flex items-center justify-center rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
