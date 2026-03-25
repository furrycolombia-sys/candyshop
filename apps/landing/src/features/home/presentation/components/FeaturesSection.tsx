"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const CATEGORIES = [
  { key: "commissions", fill: "bg-pink text-candy-text" },
  { key: "fursuits", fill: "bg-mint text-candy-text" },
  { key: "events", fill: "bg-lemon text-candy-text-on-lemon" },
  { key: "merch", fill: "bg-lilac text-candy-text" },
  { key: "digital", fill: "bg-sky text-candy-text" },
  { key: "deals", fill: "bg-peach text-candy-text" },
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
        <ul className="flex flex-wrap gap-4">
          {CATEGORIES.map(({ key, fill }) => (
            <li
              key={key}
              className={`nb-shadow-sm inline-block border-3 border-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-wider ${fill}`}
              {...tid(`category-${key}`)}
            >
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
