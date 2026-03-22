"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

export function HeroSection() {
  const t = useTranslations("landing.hero");
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "/store";

  return (
    <section
      className="relative min-h-[88vh] flex items-center bg-dots"
      aria-labelledby="hero-heading"
      {...tid("hero-section")}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          {/* Tagline — neobrutalist badge */}
          <div
            className="mb-8 inline-block border-[3px] border-foreground bg-(--lemon) px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-(--candy-text-on-lemon)"
            style={{ boxShadow: "var(--nb-shadow-sm)" }}
          >
            {t("above")}
          </div>

          <h1
            id="hero-heading"
            className="mb-8 text-[clamp(3.5rem,10vw,8rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {t("title")
              .split("\n")
              .map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
          </h1>

          <p className="mb-12 max-w-lg text-lg/relaxed text-muted-foreground">
            {t("subtitle")}
          </p>

          <a
            href={storeUrl}
            className="group inline-flex items-center gap-3 border-[3px] border-foreground bg-(--pink) px-8 py-4 font-bold uppercase tracking-wide text-(--candy-text) transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={{ boxShadow: "var(--nb-shadow-md)" }}
            {...tid("hero-cta")}
          >
            {t("cta")}
            <svg
              aria-hidden="true"
              className="size-5 transition-transform duration-150 group-hover:translate-x-1"
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
    </section>
  );
}
