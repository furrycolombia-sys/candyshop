"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const SHADOW_LG = { boxShadow: "var(--nb-shadow-lg)" };
const FONT_DISPLAY = { fontFamily: "var(--font-syne)" };

export function RolesSection() {
  const t = useTranslations("landing.split");
  const tSections = useTranslations("landing.sections");
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "/store";

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
            className="group border-[3px] border-foreground bg-(--pink) p-8 text-white transition-all duration-150 hover:-translate-0.5 lg:p-10"
            style={SHADOW_LG}
            {...tid("role-artists")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-white/90">
              {t("artists.label")}
            </p>
            <h3
              id="artists-heading"
              className="mb-4 text-3xl/tight font-extrabold uppercase lg:text-4xl"
              style={FONT_DISPLAY}
            >
              {t("artists.title")}
            </h3>
            <p className="mb-8 text-base/relaxed text-white/90">
              {t("artists.description")}
            </p>
            <a
              href={storeUrl}
              className="inline-flex items-center gap-2 border-[3px] border-white bg-(--lemon) px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ boxShadow: "3px 3px 0 0 #fff" }}
            >
              {t("artists.cta")}
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
          </div>

          {/* Fans */}
          <div
            role="group"
            aria-labelledby="fans-heading"
            className="group border-[3px] border-foreground bg-(--mint) p-8 transition-all duration-150 hover:-translate-0.5 lg:p-10"
            style={SHADOW_LG}
            {...tid("role-fans")}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-black/70">
              {t("fans.label")}
            </p>
            <h3
              id="fans-heading"
              className="mb-4 text-3xl/tight font-extrabold uppercase text-black lg:text-4xl"
              style={FONT_DISPLAY}
            >
              {t("fans.title")}
            </h3>
            <p className="mb-8 text-base/relaxed text-black/80">
              {t("fans.description")}
            </p>
            <a
              href={storeUrl}
              className="inline-flex items-center gap-2 border-[3px] border-foreground bg-(--pink) px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              style={{ boxShadow: "var(--nb-shadow-sm)" }}
            >
              {t("fans.cta")}
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
