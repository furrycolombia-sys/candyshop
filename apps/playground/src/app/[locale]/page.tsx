import { getTranslations, setRequestLocale } from "next-intl/server";
import { tid } from "shared";

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground");

  return (
    <main
      className="flex flex-1 items-center justify-center bg-dots p-4"
      {...tid("playground-page")}
    >
      <div className="nb-shadow-lg w-full max-w-md border-3 border-foreground bg-background p-8 sm:p-10 text-center">
        <h1
          className="font-display text-3xl font-extrabold uppercase tracking-tight"
          {...tid("playground-title")}
        >
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
    </main>
  );
}
