import { useTranslations } from "next-intl";
import { tid } from "shared";

const SECTION_KEYS = [
  "platformAsTool",
  "userResponsibility",
  "noMoneyHandling",
  "disputeResolution",
  "ip",
  "accountTermination",
  "limitationOfLiability",
  "changes",
  "governingLaw",
  "contact",
] as const;

export function TermsPage() {
  const t = useTranslations("legal.terms");
  const tCommon = useTranslations("legal.common");
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-12"
      {...tid("legal-terms-page")}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p
          className="mt-2 text-sm text-muted-foreground"
          {...tid("legal-last-updated")}
        >
          {tCommon("lastUpdated", { date: t("lastUpdatedDate") })}
        </p>
      </header>
      <p className="mb-8 leading-relaxed">{t("intro")}</p>
      <div className="flex flex-col gap-6">
        {SECTION_KEYS.map((key) => (
          <section key={key}>
            <h2 className="mb-2 text-xl font-semibold">
              {t(`sections.${key}.heading`)}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {t(`sections.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
