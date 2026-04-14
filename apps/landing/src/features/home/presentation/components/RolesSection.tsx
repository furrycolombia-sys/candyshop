"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

interface RoleCard {
  key: string;
  cardBg: string;
  cardText: string;
  btnBg: string;
  btnText: string;
}

const DEFAULT_CANDY_TEXT = "var(--candy-text)";
const LEMON_CANDY_TEXT = "var(--candy-text-on-lemon)";
const PINK_BG = "var(--pink)";

const ROLES: RoleCard[] = [
  {
    key: "artists",
    cardBg: PINK_BG,
    cardText: DEFAULT_CANDY_TEXT,
    btnBg: "var(--lemon)",
    btnText: LEMON_CANDY_TEXT,
  },
  {
    key: "fans",
    cardBg: "var(--mint)",
    cardText: DEFAULT_CANDY_TEXT,
    btnBg: PINK_BG,
    btnText: DEFAULT_CANDY_TEXT,
  },
];

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
          {ROLES.map(({ key, cardBg, cardText, btnBg, btnText }) => (
            <div
              key={key}
              role="group"
              aria-labelledby={`${key}-heading`}
              className="group shadow-brutal-lg flex flex-col border-strong border-foreground p-8 transition-all duration-150 hover:-translate-0.5 lg:p-10"
              style={{ backgroundColor: cardBg, color: cardText }}
              {...tid(`role-${key}`)}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-section">
                {t(`${key}.label`)}
              </p>
              <h3
                id={`${key}-heading`}
                className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
              >
                {t(`${key}.title`)}
              </h3>
              <p className="mb-8 text-base/relaxed opacity-90">
                {t(`${key}.description`)}
              </p>
              <Link
                href={appUrls.store}
                className="button-brutal button-press-sm shadow-brutal-sm mt-auto self-start px-6 py-3 text-sm"
                style={{
                  backgroundColor: btnBg,
                  color: btnText,
                  borderColor: cardText,
                  outlineColor: cardText,
                }}
              >
                {t(`${key}.cta`)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.5}
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
