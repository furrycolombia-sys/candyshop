import { useTranslations } from "next-intl";
import { tid } from "shared";

interface LegalPageProps {
  /**
   * i18n namespace where this page's content lives (e.g. `"legal.terms"`).
   * Must contain `title`, `lastUpdatedDate`, `intro`, and `sections.<key>.{heading,body}`
   * keys for every key in `sectionKeys`.
   */
  namespace: string;
  /** Stable test ID for the page root (e.g. `"legal-terms-page"`). */
  testId: string;
  /**
   * Ordered list of section keys to render. Each key resolves to
   * `<namespace>.sections.<key>.heading` and `<namespace>.sections.<key>.body`
   * in the active locale.
   */
  sectionKeys: readonly string[];
}

/**
 * Shared template for legal pages (Terms of Service, Privacy Policy).
 * Drives heading, intro, last-updated line, and section list from the
 * caller-provided i18n namespace.
 */
export function LegalPage({ namespace, testId, sectionKeys }: LegalPageProps) {
  const t = useTranslations(namespace);
  const tCommon = useTranslations("legal.common");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12" {...tid(testId)}>
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
        {sectionKeys.map((key) => (
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
