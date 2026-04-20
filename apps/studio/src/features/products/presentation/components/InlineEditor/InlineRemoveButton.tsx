"use client";

import { X } from "lucide-react";
import { tid } from "shared";

interface InlineRemoveButtonProps {
  onClick: () => void;
  ariaLabel: string;
}

export function InlineRemoveButton({
  onClick,
  ariaLabel,
}: InlineRemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
      {...tid("inline-remove-btn")}
    >
      <X className="size-3" />
    </button>
  );
}
