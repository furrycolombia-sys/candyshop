"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

export function RolesSection() {
  const t = useTranslations("landing.split");
  const tSections = useTranslations("landing.sections");

  return (
    <section
      className="relative border-t-[3px] border-foreground py-24 lg:py-32"
      aria-labelledby="roles-heading"
      {...tid("roles-section")}
    >
      <h2 id="roles-heading" className="sr-only">
        {tSections("roles")}
      </h2>
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Artists */}
          <div
            role="group"
            aria-labelledby="artists-heading"
            className="group nb-shadow-lg flex flex-col border-[3px] border-foreground bg-(--pink) p-8 text-(--candy-text) transition-all duration-150 hover:-translate-0.5 lg:p-10"
            {...tid("role-artists")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-(--candy-text)">
              {t("artists.label")}
            </p>
            <h3
              id="artists-heading"
              className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
            >
              {t("artists.title")}
            </h3>
            <p className="mb-8 text-base/relaxed text-(--candy-text)/90">
              {t("artists.description")}
            </p>
            <a
              href={appUrls.store}
              className="nb-shadow-sm mt-auto inline-flex items-center gap-2 self-start border-[3px] border-(--candy-text) bg-(--lemon) px-6 py-3 text-sm font-bold uppercase tracking-wider text-(--candy-text-on-lemon) transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--candy-text) active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {t("artists.cta")}
              <ArrowRight
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.5}
              />
            </a>
          </div>

          {/* Fans */}
          <div
            role="group"
            aria-labelledby="fans-heading"
            className="group nb-shadow-lg flex flex-col border-[3px] border-foreground bg-(--mint) p-8 text-(--candy-text) transition-all duration-150 hover:-translate-0.5 lg:p-10"
            {...tid("role-fans")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-(--candy-text)">
              {t("fans.label")}
            </p>
            <h3
              id="fans-heading"
              className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
            >
              {t("fans.title")}
            </h3>
            <p className="mb-8 text-base/relaxed text-(--candy-text)/90">
              {t("fans.description")}
            </p>
            <a
              href={appUrls.store}
              className="nb-shadow-sm mt-auto inline-flex items-center gap-2 self-start border-[3px] border-(--candy-text) bg-(--pink) px-6 py-3 text-sm font-bold uppercase tracking-wider text-(--candy-text) transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--candy-text) active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {t("fans.cta")}
              <ArrowRight
                aria-hidden="true"
                className="size-4"
                strokeWidth={2.5}
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
