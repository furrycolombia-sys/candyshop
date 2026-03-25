"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";

interface FaqItemProps {
  question: string;
  answer: string;
  index: number;
  theme: CategoryTheme;
}

export function FaqItem({ question, answer, index, theme }: FaqItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-[3px] border-foreground nb-shadow-sm"
      {...tid(`faq-item-${index}`)}
    >
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-sm uppercase tracking-wide transition-colors hover:bg-muted"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        {...tid(`faq-toggle-${index}`)}
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
          className={`px-5 pb-5 border-t-[3px] border-foreground pt-4 ${theme.bgLight}`}
          {...tid(`faq-answer-${index}`)}
        >
          <p className="text-sm/relaxed text-muted-foreground">{answer}</p>
        </div>
      )}
    </div>
  );
}
