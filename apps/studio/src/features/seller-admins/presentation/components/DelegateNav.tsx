"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

export function DelegateNav() {
  const t = useTranslations("sellerAdmins");
  const locale = useLocale();
  const pathname = usePathname();

  const myLinks = [
    { href: `/${locale}`, label: t("navProducts"), tid: "nav-products" },
    {
      href: `/${locale}/delegates`,
      label: t("navDelegates"),
      tid: "nav-delegates",
    },
  ];

  const linkClass = (href: string) =>
    cn(
      "text-sm transition-colors hover:text-foreground",
      pathname === href
        ? "font-medium text-foreground border-b-2 border-primary pb-1"
        : "text-muted-foreground",
    );

  return (
    <nav
      className="flex items-center gap-4 border-b px-6 py-2"
      aria-label={t("navigation")}
    >
      {myLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          {...tid(link.tid)}
          className={linkClass(link.href)}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
