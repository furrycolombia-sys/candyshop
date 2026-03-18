import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingHome />;
}

function LandingHome() {
  const t = useTranslations("landing");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-6">{t("hero.title")}</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-2xl text-center">
        {t("hero.subtitle")}
      </p>
      <div className="flex gap-4">
        <a
          href={process.env.NEXT_PUBLIC_STORE_URL || "/store"}
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          {t("cta.shop")}
        </a>
        <a
          href={process.env.NEXT_PUBLIC_PAYMENTS_URL || "/payments"}
          className="rounded-lg border px-6 py-3 font-medium hover:bg-muted transition-colors"
        >
          {t("cta.payments")}
        </a>
      </div>
    </main>
  );
}
