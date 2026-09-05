import { getTranslations, setRequestLocale } from "next-intl/server";

/**
 * Env Viewer — reads NEXT_PUBLIC_ENV_DEBUG set by load-env.mjs when ENV_DEBUG=true.
 * Sits behind admin's existing auth via the [locale] layout's ProtectedRoute.
 */
export default async function EnvPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("env");

  const raw = process.env.NEXT_PUBLIC_ENV_DEBUG;

  if (!raw) {
    return (
      <main className="p-8 font-mono text-sm">
        <h1 className="mb-2 text-xl font-bold">{t("title")}</h1>
        <p className="text-destructive">{t("notEnabled")}</p>
      </main>
    );
  }

  const vars = JSON.parse(raw) as Record<string, string>;
  const rows = Object.entries(vars).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="p-8 font-mono text-sm">
      <h1 className="mb-1 text-xl font-bold">{t("title")}</h1>
      <p className="mb-6 text-xs text-muted-foreground">
        {t("summary", {
          targetEnv: vars.TARGET_ENV ?? t("notSet"),
          nodeEnv: vars.NODE_ENV ?? t("notSet"),
          count: rows.length,
        })}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-foreground/20 text-left">
            <th className="pb-2 pr-4 font-semibold">{t("key")}</th>
            <th className="pb-2 font-semibold">{t("value")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} className="border-b border-foreground/10">
              <td className="py-1 pr-4 whitespace-nowrap text-info">{key}</td>
              <td className="max-w-xl break-all py-1">
                {value ? (
                  <span className="text-success">{value}</span>
                ) : (
                  <span className="text-destructive italic">{t("notSet")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
