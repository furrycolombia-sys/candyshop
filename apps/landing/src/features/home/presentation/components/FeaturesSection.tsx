"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const CT = "text-(--candy-text)";
const CTL = "text-(--candy-text-on-lemon)";

const CATEGORIES = [
  { key: "commissions", fill: `bg-(--pink) ${CT}` },
  { key: "fursuits", fill: `bg-(--mint) ${CT}` },
  { key: "events", fill: `bg-(--lemon) ${CTL}` },
  { key: "merch", fill: `bg-(--lilac) ${CT}` },
  { key: "digital", fill: `bg-(--sky) ${CT}` },
  { key: "deals", fill: `bg-(--peach) ${CT}` },
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
