"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

export function HeroSection() {
  const t = useTranslations("landing.hero");

  return (
    <section
      className="relative flex min-h-hero-stage items-center surface-grid-dots"
      aria-labelledby="hero-heading"
      {...tid("hero-section")}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          {/* Tagline — neobrutalist badge */}
          <div className="shadow-brutal-sm mb-8 inline-block border-strong border-foreground bg-warning px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-warning-foreground">
            {t("above")}
          </div>

          <h1
            id="hero-heading"
            className="text-hero-display mb-8 font-display uppercase text-foreground"
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
            href={appUrls.store}
            className="group button-brutal button-press-lg shadow-brutal-md gap-3 bg-primary px-8 py-4 text-primary-foreground"
            {...tid("hero-cta")}
          >
            {t("cta")}
            <ArrowRight
              aria-hidden="true"
              className="size-5 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={2.5}
            />
          </a>
        </div>
      </div>
    </section>
  );
}
