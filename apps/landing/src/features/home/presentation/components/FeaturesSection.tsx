"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const DEFAULT_CANDY_TEXT = "var(--candy-text)";

const CATEGORIES = [
  { key: "commissions", bg: "var(--pink)", fg: DEFAULT_CANDY_TEXT },
  { key: "fursuits", bg: "var(--mint)", fg: DEFAULT_CANDY_TEXT },
  { key: "events", bg: "var(--lemon)", fg: "var(--candy-text-on-lemon)" },
  { key: "merch", bg: "var(--lilac)", fg: DEFAULT_CANDY_TEXT },
  { key: "digital", bg: "var(--sky)", fg: DEFAULT_CANDY_TEXT },
  { key: "deals", bg: "var(--peach)", fg: DEFAULT_CANDY_TEXT },
] as const;

export function FeaturesSection() {
  const t = useTranslations("landing.categories");
  const tSections = useTranslations("landing.sections");

  return (
    <section
      id="features"
      className="relative border-t-strong border-foreground bg-muted py-20 lg:py-28"
      aria-labelledby="features-heading"
      {...tid("features-section")}
    >
      <h2 id="features-heading" className="sr-only">
        {tSections("categories")}
      </h2>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <ul className="flex flex-wrap gap-4">
          {CATEGORIES.map(({ key, bg, fg }) => (
            <li
              key={key}
              className="shadow-brutal-sm inline-block border-strong border-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-wider"
              style={{ backgroundColor: bg, color: fg }}
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
