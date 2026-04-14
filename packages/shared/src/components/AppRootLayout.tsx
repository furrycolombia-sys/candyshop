/* eslint-disable @next/next/no-head-element */
"use server";

import { DM_Sans, Syne } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeScript } from "./ThemeScript";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface AppRootLayoutProps {
  children: ReactNode;
  locale: string;
}

export async function AppRootLayout({ children, locale }: AppRootLayoutProps) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${syne.variable} ${dmSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
