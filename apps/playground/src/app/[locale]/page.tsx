import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  return (
    <main className="flex flex-1 items-center justify-center bg-dots p-8">
      <div className="nb-shadow-lg w-full max-w-lg border-[3px] border-foreground bg-background p-10 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-foreground/60">{t("subtitle")}</p>
      </div>
    </main>
  );
}
