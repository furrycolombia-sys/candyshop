"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const FILL_AMBER = "bg-[#d4a843]";
const FILL_GREEN = "bg-[#1b6b3a] text-white";

const CATEGORIES = [
  { key: "commissions", fill: FILL_AMBER },
  { key: "fursuits", fill: FILL_GREEN },
  { key: "events", fill: "bg-[#8b6914] text-white" },
  { key: "merch", fill: FILL_AMBER },
  { key: "digital", fill: FILL_GREEN },
  { key: "deals", fill: "bg-[#f0dfa0]" },
] as const;

export function FeaturesSection() {
  const t = useTranslations("landing.categories");

  return (
    <section
      id="features"
      className="relative border-t-[3px] border-foreground py-20 lg:py-28"
      {...tid("features-section")}
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-wrap gap-4">
          {CATEGORIES.map(({ key, fill }) => (
            <span
              key={key}
              className={`inline-block border-[3px] border-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-150 cursor-default hover:-translate-0.5 ${fill}`}
              style={{ boxShadow: "var(--nb-shadow-sm)" }}
              {...tid(`category-${key}`)}
            >
              {t(key)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
