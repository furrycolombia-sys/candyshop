import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("payments");

  return (
    <main className="flex flex-1 items-center justify-center bg-dots p-8">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="nb-shadow-lg border-[3px] border-foreground bg-background p-10">
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="nb-shadow-lg border-[3px] border-foreground bg-background p-6">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
              {t("cards.products")}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("cards.productsDesc")}
            </p>
          </div>
          <div className="nb-shadow-lg border-[3px] border-foreground bg-background p-6">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
              {t("cards.services")}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("cards.servicesDesc")}
            </p>
          </div>
          <div className="nb-shadow-lg border-[3px] border-foreground bg-background p-6">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
              {t("cards.tickets")}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("cards.ticketsDesc")}
            </p>
          </div>
          <div className="nb-shadow-lg border-[3px] border-foreground bg-background p-6">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
              {t("cards.coupons")}
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              {t("cards.couponsDesc")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
