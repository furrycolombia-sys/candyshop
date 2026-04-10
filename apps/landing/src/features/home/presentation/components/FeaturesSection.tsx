"use client";

import {
  BadgePercent,
  BrushCleaning,
  Gem,
  Megaphone,
  Palette,
  Shirt,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

const DEFAULT_CANDY_TEXT = "var(--candy-text)";
const SECTION_LABEL_KEY = "categories";
const TILT_LEFT = "-rotate-[1deg]";
const TILT_RIGHT = "rotate-[1deg]";

const CATEGORIES = [
  {
    key: "commissions",
    bg: "var(--pink)",
    fg: DEFAULT_CANDY_TEXT,
    icon: Palette,
    tilt: TILT_LEFT,
  },
  {
    key: "fursuits",
    bg: "var(--mint)",
    fg: DEFAULT_CANDY_TEXT,
    icon: BrushCleaning,
    tilt: TILT_RIGHT,
  },
  {
    key: "events",
    bg: "var(--lemon)",
    fg: "var(--candy-text-on-lemon)",
    icon: Megaphone,
    tilt: "-rotate-[0.75deg]",
  },
  {
    key: "merch",
    bg: "var(--lilac)",
    fg: DEFAULT_CANDY_TEXT,
    icon: Shirt,
    tilt: "rotate-[0.75deg]",
  },
  {
    key: "digital",
    bg: "var(--sky)",
    fg: DEFAULT_CANDY_TEXT,
    icon: Gem,
    tilt: TILT_LEFT,
  },
  {
    key: "deals",
    bg: "var(--peach)",
    fg: DEFAULT_CANDY_TEXT,
    icon: BadgePercent,
    tilt: TILT_RIGHT,
  },
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
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-10 max-w-2xl lg:mb-12">
          <div className="shadow-brutal-sm mb-5 inline-block border-strong border-foreground bg-background px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-foreground">
            {tSections(SECTION_LABEL_KEY)}
          </div>
          <h2
            id="features-heading"
            className="mb-4 font-display text-4xl/tight font-extrabold uppercase text-foreground sm:text-5xl/tight"
          >
            {tSections("categoriesTitle")}
          </h2>
          <p className="max-w-xl text-base/relaxed text-muted-foreground sm:text-lg/relaxed">
            {tSections("categoriesIntro")}
          </p>
        </div>
        <ul
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          aria-label={tSections(SECTION_LABEL_KEY)}
        >
          {CATEGORIES.map(({ key, bg, fg, icon: iconComponent, tilt }) => (
            <li key={key} className="list-none" {...tid(`category-${key}`)}>
              <article
                className={`group shadow-brutal-lg relative flex h-full min-h-52 flex-col overflow-hidden border-strong border-foreground p-6 transition-transform duration-150 hover:-translate-y-1 sm:min-h-56 lg:p-7 ${tilt} xl:even:translate-y-6`}
                style={{ backgroundColor: bg, color: fg }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-4 border-b-3 border-foreground/70 bg-background/25"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-5 right-5 size-18 rounded-full border border-foreground/15 bg-background/12"
                  aria-hidden="true"
                />
                <div className="mb-8 flex items-start justify-between gap-4">
                  <span className="border-strong border-foreground bg-background/70 px-3 py-1 text-[11px] font-bold uppercase tracking-section">
                    {tSections("categories")}
                  </span>
                  <span
                    className="shadow-brutal-sm flex size-14 items-center justify-center border-strong border-foreground bg-background/80"
                    aria-hidden="true"
                  >
                    {iconComponent({ className: "size-6", strokeWidth: 2.4 })}
                  </span>
                </div>
                <div className="mt-auto pr-10">
                  <p className="max-w-full text-pretty font-display text-[1.55rem] leading-[0.94] font-extrabold uppercase sm:text-[1.8rem] lg:text-[2rem]">
                    {t(key)}
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <div className="h-1.5 w-16 border-strong border-foreground bg-background/70" />
                    <div className="h-1.5 w-6 border-strong border-foreground bg-background/40" />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
