import { Syne } from "next/font/google";
import { getLocale } from "next-intl/server";
import { ThemeScript } from "shared/components";

import "@/app/globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${syne.variable} antialiased`}>{children}</body>
    </html>
  );
}
