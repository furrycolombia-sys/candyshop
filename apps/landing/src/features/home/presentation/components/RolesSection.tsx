"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

const DEFAULT_LIBRA_TEXT = "var(--libra-text)";
const LEMON_LIBRA_TEXT = "var(--libra-text-on-lemon)";
const PINK_BG = "var(--pink)";

// No opacity modifiers on text here. `opacity-90` and `opacity-70` blend the
// element -- foreground and background together -- toward the page behind it,
// which is invisible to a token-level contrast check and dropped these below
// WCAG AA in dark mode: 4.39:1 for the paragraphs and 3.85:1 for the badge.
// Reach for a muted token if something needs de-emphasising, not opacity.
export function RolesSection() {
  const t = useTranslations("landing.split");
  const tSections = useTranslations("landing.sections");

  return (
    <section
      className="relative border-t-strong border-foreground py-24 lg:py-32"
      aria-labelledby="roles-heading"
      {...tid("roles-section")}
    >
      <h2 id="roles-heading" className="sr-only">
        {tSections("roles")}
      </h2>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Artists card */}
          <div
            role="group"
            aria-labelledby="artists-heading"
            className="shadow-brutal-lg flex flex-col border-strong border-foreground p-8 lg:p-10"
            style={{ backgroundColor: PINK_BG, color: DEFAULT_LIBRA_TEXT }}
            {...tid("role-artists")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-section">
              {t("artists.label")}
            </p>
            <h3
              id="artists-heading"
              className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
            >
              {t("artists.title")}
            </h3>
            <p className="mb-8 text-base/relaxed">{t("artists.description")}</p>
            <span
              className="shadow-brutal-sm mt-auto inline-flex self-start border-strong border-foreground px-6 py-3 text-sm font-extrabold uppercase tracking-wider"
              style={{
                backgroundColor: "var(--lemon)",
                color: LEMON_LIBRA_TEXT,
              }}
            >
              {t("artists.comingSoon")}
            </span>
          </div>

          {/* Fans card */}
          <div
            role="group"
            aria-labelledby="fans-heading"
            className="shadow-brutal-lg flex flex-col border-strong border-foreground p-8 lg:p-10"
            style={{
              backgroundColor: "var(--mint)",
              color: DEFAULT_LIBRA_TEXT,
            }}
            {...tid("role-fans")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-section">
              {t("fans.label")}
            </p>
            <h3
              id="fans-heading"
              className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
            >
              {t("fans.title")}
            </h3>
            <p className="mb-8 text-base/relaxed">{t("fans.description")}</p>
            <Link
              href={appUrls.store}
              className="button-brutal button-press-sm shadow-brutal-sm mt-auto inline-flex self-start px-6 py-3 text-sm font-extrabold"
              style={{
                backgroundColor: PINK_BG,
                color: DEFAULT_LIBRA_TEXT,
                borderColor: DEFAULT_LIBRA_TEXT,
                outlineColor: DEFAULT_LIBRA_TEXT,
              }}
            >
              {t("fans.cta")}
              <ArrowRight
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.5}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
