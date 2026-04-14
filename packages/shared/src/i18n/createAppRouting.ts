import { defineRouting } from "next-intl/routing";

export function createAppRouting() {
  return defineRouting({
    locales: (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || "en,es").split(","),
    defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
  });
}
