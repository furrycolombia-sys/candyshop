"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const FILL_PINK = "bg-[var(--pink)] text-white";
const FILL_MINT = "bg-[var(--mint)] text-black";

const CATEGORIES = [
  { key: "commissions", fill: FILL_PINK },
  { key: "fursuits", fill: FILL_MINT },
  { key: "events", fill: "bg-[var(--lemon)] text-black" },
  { key: "merch", fill: "bg-[var(--lilac)] text-black" },
  { key: "digital", fill: "bg-[var(--sky)] text-black" },
  { key: "deals", fill: "bg-[var(--peach)] text-black" },
] as const;

export function FeaturesSection() {
  const t = useTranslations("landing.categories");
  const tSections = useTranslations("landing.sections");

  return (
    <section
      id="features"
      className="relative border-t-[3px] border-foreground bg-muted py-20 lg:py-28"
      aria-labelledby="features-heading"
      {...tid("features-section")}
    >
      <h2 id="features-heading" className="sr-only">
        {tSections("categories")}
      </h2>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="flex flex-wrap gap-4">
          {CATEGORIES.map(({ key, fill }) => (
            <span
              key={key}
              className={`inline-block border-[3px] border-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-wider ${fill}`}
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
