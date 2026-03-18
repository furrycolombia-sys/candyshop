import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PaymentsHome />;
}

function PaymentsHome() {
  const t = useTranslations("payments");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
      <p className="text-lg text-muted-foreground mb-8">{t("subtitle")}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-2">{t("cards.products")}</h2>
          <p className="text-muted-foreground">{t("cards.productsDesc")}</p>
        </div>
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-2">{t("cards.services")}</h2>
          <p className="text-muted-foreground">{t("cards.servicesDesc")}</p>
        </div>
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-2">{t("cards.tickets")}</h2>
          <p className="text-muted-foreground">{t("cards.ticketsDesc")}</p>
        </div>
        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold mb-2">{t("cards.coupons")}</h2>
          <p className="text-muted-foreground">{t("cards.couponsDesc")}</p>
        </div>
      </div>
    </main>
  );
}
