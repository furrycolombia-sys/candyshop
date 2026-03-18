import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminDashboard />;
}

function AdminDashboard() {
  const t = useTranslations("admin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
    </main>
  );
}
