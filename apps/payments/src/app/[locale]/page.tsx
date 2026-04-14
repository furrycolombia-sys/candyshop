import { getTranslations, setRequestLocale } from "next-intl/server";
import { tid } from "shared";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("payments");

  return (
    <main
      className="flex flex-1 items-center justify-center surface-grid-dots p-4"
      {...tid("payments-page")}
    >
      <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 sm:p-10 text-center">
        <h1
          className="font-display text-3xl font-extrabold uppercase tracking-tight"
          {...tid("payments-title")}
        >
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
    </main>
  );
}
