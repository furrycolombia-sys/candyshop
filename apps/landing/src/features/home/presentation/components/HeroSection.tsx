"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

export function HeroSection() {
  const t = useTranslations("landing.hero");

  return (
    <section
      className="relative min-h-[88vh] flex items-center bg-dots"
      aria-labelledby="hero-heading"
      {...tid("hero-section")}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          {/* Tagline — neobrutalist badge */}
          <div className="nb-shadow-sm mb-8 inline-block border-[3px] border-foreground bg-(--lemon) px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-(--candy-text-on-lemon)">
            {t("above")}
          </div>

          <h1
            id="hero-heading"
            className="mb-8 font-display text-[clamp(3.5rem,10vw,8rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground"
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
            className="group nb-shadow-md inline-flex items-center gap-3 border-[3px] border-foreground bg-(--pink) px-8 py-4 font-bold uppercase tracking-wide text-(--candy-text) transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
