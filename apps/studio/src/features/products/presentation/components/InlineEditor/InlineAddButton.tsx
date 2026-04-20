"use client";

import { Plus } from "lucide-react";
import { tid } from "shared";

interface InlineAddButtonProps {
  label: string;
  onClick: () => void;
}

export function InlineAddButton({ label, onClick }: InlineAddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-strong border-dashed border-foreground/40 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground/70 hover:text-foreground"
      {...tid("inline-add-btn")}
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}
