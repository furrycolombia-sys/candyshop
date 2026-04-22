import { TallyFeedbackButton } from "@monorepo/app-components";
import { getServerUserEmail } from "api/supabase/server";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

import { Providers } from "@/app/[locale]/providers";
import { appUrls } from "@/shared/infrastructure/config";
import { routing } from "@/shared/infrastructure/i18n";
import { ThemeProvider } from "@/shared/infrastructure/providers";
import { AppTopNavigation } from "@/shared/presentation/components/AppTopNavigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getMessages();

  const userEmail = await getServerUserEmail();

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages}>
        <Providers>
          <AppTopNavigation
            currentApp="landing"
            urls={appUrls}
            locales={routing.locales}
            userEmail={userEmail}
          />
          {children}
          <TallyFeedbackButton />
        </Providers>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
