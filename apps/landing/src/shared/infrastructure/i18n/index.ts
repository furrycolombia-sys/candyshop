import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || "en,es").split(","),
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
