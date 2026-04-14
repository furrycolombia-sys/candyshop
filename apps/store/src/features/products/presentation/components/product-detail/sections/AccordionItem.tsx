"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";

interface AccordionItemProps {
  question: string;
  answer: string;
  index: number;
  theme: CategoryTheme;
}

export function AccordionItem({
  question,
  answer,
  index,
  theme,
}: AccordionItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-strong border-foreground shadow-brutal-sm"
      {...tid(`accordion-item-${index}`)}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-sm uppercase tracking-wide transition-colors hover:bg-muted"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        {...tid(`accordion-toggle-${index}`)}
      >
        <span>{question}</span>
        {open ? (
          <Minus className="size-5 shrink-0" />
        ) : (
          <Plus className="size-5 shrink-0" />
        )}
      </button>
      {open && (
        <div
          className="border-t-strong border-foreground px-5 pb-5 pt-4"
          style={{ backgroundColor: theme.bgLight }}
          {...tid(`accordion-answer-${index}`)}
        >
          <p className="text-sm/relaxed text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
