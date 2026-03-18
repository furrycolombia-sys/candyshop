"use client";

import { setCookie } from "cookies-next";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { tid } from "../utils/tid";

const LOCALE_MAX_AGE_SECONDS = 31_536_000; // 365 days

interface LocaleSwitcherProps {
  locales: readonly string[];
}

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
  pt: "PT",
  de: "DE",
  ja: "JA",
  zh: "ZH",
  ko: "KO",
};

export function LocaleSwitcher({ locales }: LocaleSwitcherProps) {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");

  function switchLocale(nextLocale: string) {
    // Persist locale in cookie so all apps and next-intl middleware pick it up
    setCookie("NEXT_LOCALE", nextLocale, {
      path: "/",
      maxAge: LOCALE_MAX_AGE_SECONDS,
      sameSite: "lax",
    });

    // Replace the locale segment in the pathname
    const segments = pathname.split("/");
    if (segments.length > 1 && locales.includes(segments[1])) {
      segments[1] = nextLocale;
    }
    const newPath = segments.join("/") || `/${nextLocale}`;

    startTransition(() => {
      router.replace(newPath);
    });
  }

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label={t("language.select")}
    >
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <button
            key={locale}
            {...tid(`locale-switch-${locale}`)}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isPending}
            onClick={() => switchLocale(locale)}
            className={[
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
              isPending ? "opacity-50" : "",
            ].join(" ")}
          >
            {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export type { LocaleSwitcherProps };
