import "@/app/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppRootLayout } from "shared/app-root-layout";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  return (
    <ClerkProvider>
      <AppRootLayout locale={locale}>{children}</AppRootLayout>
    </ClerkProvider>
  );
}
