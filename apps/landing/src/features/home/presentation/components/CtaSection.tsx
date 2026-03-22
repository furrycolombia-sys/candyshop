"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

const SHADOW_MD = { boxShadow: "var(--nb-shadow-md)" };

export function CtaSection() {
  const t = useTranslations("landing.cta");
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || "/store";
  const paymentsUrl = process.env.NEXT_PUBLIC_PAYMENTS_URL || "/payments";

  return (
    <section
      className="relative border-t-[3px] border-foreground bg-dots py-32 lg:py-44"
      aria-labelledby="cta-heading"
      {...tid("cta-section")}
    >
      <div className="mx-auto max-w-6xl px-6 text-center lg:px-8">
        <h2
          id="cta-heading"
          className="mb-14 text-[clamp(2.5rem,7vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          {t("title")}
        </h2>

        <div className="flex flex-wrap justify-center gap-5">
          <a
            href={storeUrl}
            className="group inline-flex items-center gap-3 border-[3px] border-foreground bg-(--pink) px-8 py-4 font-bold uppercase tracking-wider text-white transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={SHADOW_MD}
            {...tid("final-cta")}
          >
            {t("cta")}
            <svg
              aria-hidden="true"
              className="size-4 transition-transform duration-150 group-hover:translate-x-1"
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
          <a
            href={paymentsUrl}
            className="inline-flex items-center gap-2 border-[3px] border-foreground bg-background px-8 py-4 font-bold uppercase tracking-wider text-foreground transition-all duration-150 hover:-translate-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={SHADOW_MD}
            {...tid("final-payments")}
          >
            {t("payments")}
          </a>
        </div>
      </div>
    </section>
  );
}
