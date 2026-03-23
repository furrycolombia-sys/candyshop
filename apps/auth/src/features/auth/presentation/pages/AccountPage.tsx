"use client";

/* eslint-disable @next/next/no-img-element */
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";
import { appUrls } from "@/shared/infrastructure/config";

export function AccountPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { user, signOut } = useSupabaseAuth();

  const provider = user?.app_metadata?.provider ?? "unknown";
  const email = user?.email ?? "";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const fullName =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";

  const handleSignOut = async () => {
    await signOut();
    globalThis.location.href = `/${locale}/login`;
  };

  return (
    <main className="flex flex-1 items-center justify-center bg-dots p-4">
      <div
        className="nb-shadow-lg w-full max-w-md border-[3px] border-foreground bg-background p-8 sm:p-10"
        {...tid("account-card")}
      >
        <div className="mb-8 text-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="mx-auto mb-4 size-20 rounded-full border-[3px] border-foreground"
            />
          ) : null}
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            {t("account.title")}
          </h1>
          {fullName ? (
            <p className="mt-1 text-lg font-bold">{fullName}</p>
          ) : null}
          <p className="mt-1 text-sm text-foreground/60">
            {t("account.subtitle")}
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
            <span className="text-sm font-medium text-foreground/60">
              {t("account.email")}
            </span>
            <span className="text-sm font-bold" {...tid("account-email")}>
              {email}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
            <span className="text-sm font-medium text-foreground/60">
              {t("account.provider")}
            </span>
            <span
              className="text-sm font-bold capitalize"
              {...tid("account-provider")}
            >
              {provider}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={appUrls.store}
            className="nb-btn nb-btn-press-sm nb-shadow-sm w-full justify-center bg-primary px-6 py-3 text-sm text-primary-foreground"
            {...tid("go-to-store")}
          >
            {t("account.goToStore")}
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="nb-btn nb-btn-press-sm w-full justify-center border-2 border-foreground px-6 py-3 text-sm"
            {...tid("sign-out")}
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </main>
  );
}
