"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

export function CtaSection() {
  const t = useTranslations("landing.cta");

  return (
    <section
      className="relative border-t-strong border-foreground surface-grid-dots py-32 lg:py-44"
      aria-labelledby="cta-heading"
      {...tid("cta-section")}
    >
      <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
        <h2
          id="cta-heading"
          className="text-cta-display mb-14 font-display uppercase text-foreground"
        >
          {t("title")}
        </h2>

        <div className="flex flex-wrap justify-center gap-5">
          <Link
            href={appUrls.store}
            className="group button-brutal button-press-lg shadow-brutal-md gap-3 bg-primary px-8 py-4 text-primary-foreground"
            {...tid("final-cta")}
          >
            {t("cta")}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-150 group-hover:translate-x-1"
              strokeWidth={2.5}
            />
          </Link>
          <Link
            href={appUrls.payments}
            className="button-brutal button-press-lg shadow-brutal-md bg-background px-8 py-4 text-foreground"
            {...tid("final-payments")}
          >
            {t("payments")}
          </Link>
        </div>
      </div>
    </section>
  );
}
