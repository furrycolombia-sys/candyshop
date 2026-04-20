"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
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
      <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-6 lg:max-w-2xl">
          {/* Eyebrow badge — non-interactive, styled as pure label */}
          <div
            className="shadow-brutal-sm w-fit border-strong border-foreground bg-warning px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-warning-foreground"
            aria-label={t("above")}
          >
            {t("above")}
          </div>

          {/* Title — compact, single-line intent, never wraps on desktop */}
          <h1
            id="hero-heading"
            className="font-display text-4xl/[1.05] font-extrabold uppercase text-foreground sm:text-5xl/[1.05] lg:text-6xl/[1.05]"
          >
            {t("title")}
          </h1>

          <p className="max-w-md text-base/relaxed text-muted-foreground sm:text-lg/relaxed">
            {t("subtitle")}
          </p>

          {/* Primary CTA — visually dominant, unmistakably a button */}
          <div className="pt-2">
            <Link
              href={appUrls.store}
              className="group button-brutal button-press-lg shadow-brutal-md inline-flex gap-3 bg-primary px-8 py-4 text-base font-extrabold text-primary-foreground"
              {...tid("hero-cta")}
            >
              {t("cta")}
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform duration-150 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
