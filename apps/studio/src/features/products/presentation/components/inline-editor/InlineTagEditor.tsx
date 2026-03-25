"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface InlineTagEditorProps {
  control: Control<ProductFormValues>;
}

/** Parse comma-separated tag string into array */
function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function InlineTagEditor({ control }: InlineTagEditorProps) {
  const t = useTranslations("form.inlineEditor");

  const { field } = useController({ control, name: "tags" });

  const { value: fieldValue, onChange: fieldOnChange } = field;
  const tags = parseTags(String(fieldValue ?? ""));
  const [newTag, setNewTag] = useState("");
  const [showInput, setShowInput] = useState(false);

  const updateTags = useCallback(
    (updated: string[]) => {
      fieldOnChange(updated.join(", "));
    },
    [fieldOnChange],
  );

  const handleRemove = useCallback(
    (tagToRemove: string) => {
      const updated = tags.filter((tag) => tag !== tagToRemove);
      updateTags(updated);
    },
    [tags, updateTags],
  );

  const handleAdd = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setNewTag("");
      return;
    }
    updateTags([...tags, trimmed]);
    setNewTag("");
  }, [newTag, tags, updateTags]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
      if (e.key === "Escape") {
        setShowInput(false);
        setNewTag("");
      }
    },
    [handleAdd],
  );

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      {...tid("inline-tag-editor")}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full border-2 border-foreground bg-muted px-2.5 py-0.5 font-display text-tiny font-bold uppercase tracking-widest"
        >
          #{tag}
          <button
            type="button"
            onClick={() => handleRemove(tag)}
            aria-label={t("removeTag")}
            className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {showInput ? (
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            handleAdd();
            setShowInput(false);
          }}
          placeholder={t("tagPlaceholder")}
          className="w-28 border-b-2 border-dashed border-foreground/30 bg-transparent px-1 py-0.5 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-foreground/60"
          autoFocus
          {...tid("inline-tag-input")}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="rounded-full border-2 border-dashed border-foreground/30 px-2.5 py-0.5 font-display text-tiny font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/60 hover:text-foreground"
          {...tid("inline-tag-add-btn")}
        >
          + {t("addTag")}
        </button>
      )}
    </div>
  );
}
