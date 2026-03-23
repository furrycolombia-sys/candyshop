"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { appUrls } from "@/shared/infrastructure/config";

interface RoleCard {
  key: string;
  cardBg: string;
  btnBg: string;
  btnText: string;
}

const ROLES: RoleCard[] = [
  {
    key: "artists",
    // eslint-disable-next-line sonarjs/no-duplicate-string -- Tailwind classes repeated intentionally
    cardBg: "bg-(--pink)",
    btnBg: "bg-(--lemon)",
    btnText: "text-(--candy-text-on-lemon)",
  },
  {
    key: "fans",
    cardBg: "bg-(--mint)",
    btnBg: "bg-(--pink)",
    btnText: "text-(--candy-text)",
  },
];

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
          {ROLES.map(({ key, cardBg, btnBg, btnText }) => (
            <div
              key={key}
              role="group"
              aria-labelledby={`${key}-heading`}
              className={`group nb-shadow-lg flex flex-col border-[3px] border-foreground ${cardBg} p-8 text-(--candy-text) transition-all duration-150 hover:-translate-0.5 lg:p-10`}
              {...tid(`role-${key}`)}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-(--candy-text)">
                {t(`${key}.label`)}
              </p>
              <h3
                id={`${key}-heading`}
                className="mb-4 font-display text-3xl/tight font-extrabold uppercase lg:text-4xl"
              >
                {t(`${key}.title`)}
              </h3>
              <p className="mb-8 text-base/relaxed text-(--candy-text)/90">
                {t(`${key}.description`)}
              </p>
              <a
                href={appUrls.store}
                className={`nb-btn nb-btn-press-sm nb-shadow-sm mt-auto self-start border-(--candy-text) ${btnBg} px-6 py-3 text-sm ${btnText} focus-visible:outline-(--candy-text)`}
              >
                {t(`${key}.cta`)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={2.5}
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
