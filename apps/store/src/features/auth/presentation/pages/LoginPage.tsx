"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Card } from "ui";

import { SocialLoginButtons } from "../components/SocialLoginButtons";

export function LoginPage() {
  const t = useTranslations("auth.login");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8" {...tid("login-card")}>
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <SocialLoginButtons />
        </div>
      </Card>
    </main>
  );
}
