"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

export function AccessDeniedState() {
  const t = useTranslations("common");

  return (
    <main
      className="flex flex-1 items-center justify-center bg-dots p-6"
      {...tid("access-denied")}
    >
      <div className="nb-shadow-lg w-full max-w-xl border-3 border-foreground bg-background p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-destructive" />
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          {t("accessDenied")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("accessDeniedHint")}
        </p>
      </div>
    </main>
  );
}
