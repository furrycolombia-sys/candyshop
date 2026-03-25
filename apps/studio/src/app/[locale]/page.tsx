import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "studio" });

  return (
    <main className="flex-1 p-8">
      <h1 className="font-display text-4xl font-extrabold uppercase">
        {t("title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
    </main>
  );
}
