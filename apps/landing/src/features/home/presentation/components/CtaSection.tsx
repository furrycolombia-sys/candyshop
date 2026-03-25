"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

export function CtaSection() {
  const t = useTranslations("landing.cta");

  return (
    <section
      className="relative border-t-[3px] border-foreground bg-dots py-32 lg:py-44"
      aria-labelledby="cta-heading"
      {...tid("cta-section")}
    >
      <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
        <h2
          id="cta-heading"
          className="mb-14 font-display text-[clamp(2.5rem,7vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground"
        >
          {t("title")}
        </h2>

        <div className="flex flex-wrap justify-center gap-5">
          <a
            href={appUrls.store}
            className="group nb-btn nb-btn-press-lg nb-shadow-md gap-3 bg-pink px-8 py-4 text-candy-text"
            {...tid("final-cta")}
          >
            {t("cta")}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={2.5}
            />
          </a>
          <a
            href={appUrls.payments}
            className="nb-btn nb-btn-press-lg nb-shadow-md bg-background px-8 py-4 text-foreground"
            {...tid("final-payments")}
          >
            {t("payments")}
          </a>
        </div>
      </div>
    </section>
  );
}
