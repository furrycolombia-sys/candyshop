"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useProfile } from "@/features/account/application/hooks/useProfile";
import { useUpdateProfile } from "@/features/account/application/hooks/useUpdateProfile";
import { ProfileCard } from "@/features/account/presentation/components/ProfileCard";
import { ProfileForm } from "@/features/account/presentation/components/ProfileForm";
import { useSupabaseAuth } from "@/features/auth/application/hooks/useSupabaseAuth";

export function AccountSettingsPage() {
  const t = useTranslations("auth.accountSettings");
  const tAuth = useTranslations("auth");
  const { user, signOut } = useSupabaseAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateMutation = useUpdateProfile(user?.id ?? "");

  if (isLoading || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dots p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col items-center bg-dots px-4 py-10"
      {...tid("account-settings-page")}
    >
      <div className="w-full max-w-lg">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <div className="flex flex-col gap-6">
          <ProfileCard profile={profile} />

          <ProfileForm
            profile={profile}
            onSubmit={updateMutation.mutate}
            isPending={updateMutation.isPending}
            isSuccess={updateMutation.isSuccess}
            isError={updateMutation.isError}
          />

          {/* Sign out button */}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              globalThis.location.replace("/login");
            }}
            className="nb-btn nb-btn-press-sm w-full justify-center border-2 border-foreground px-6 py-3 text-sm"
            {...tid("sign-out")}
          >
            {tAuth("signOut")}
          </button>
        </div>
      </div>
    </main>
  );
}
