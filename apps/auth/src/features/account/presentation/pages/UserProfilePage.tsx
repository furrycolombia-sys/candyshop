"use client";

import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useProfile } from "@/features/account/application/hooks/useProfile";

interface UserProfilePageProps {
  userId: string;
}

export function UserProfilePage({ userId }: UserProfilePageProps) {
  const t = useTranslations("auth.profile");
  const locale = useLocale();
  const { data: profile, isLoading, isError } = useProfile(userId);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dots p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="mx-auto size-20 rounded-full" />
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </main>
    );
  }

  if (isError || !profile) {
    return (
      <main className="flex flex-1 items-center justify-center bg-dots p-4">
        <div
          className="nb-shadow-lg w-full max-w-md border-3 border-foreground bg-background p-8 text-center"
          {...tid("profile-not-found")}
        >
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("notFound")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("notFoundSubtitle")}
          </p>
        </div>
      </main>
    );
  }

  const displayName = profile.display_name ?? profile.email.split("@")[0];
  const avatarUrl = profile.display_avatar_url ?? profile.avatar_url;
  const contactEmail = profile.display_email ?? profile.email;
  const memberSince = new Date(profile.first_seen_at).toLocaleDateString(
    locale,
    { year: "numeric", month: "long" },
  );

  return (
    <main
      className="flex flex-1 items-center justify-center bg-dots p-4"
      {...tid("user-profile-page")}
    >
      <div className="nb-shadow-lg w-full max-w-md border-3 border-foreground bg-background p-8 sm:p-10">
        {/* Avatar + Name */}
        <div className="mb-6 text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar URL
            <img
              src={avatarUrl}
              alt=""
              className="mx-auto mb-4 size-20 rounded-full border-3 border-foreground"
            />
          ) : (
            <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full border-3 border-foreground bg-muted">
              <span className="font-display text-2xl font-extrabold uppercase text-muted-foreground">
                {displayName.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {displayName}
          </h1>
          {profile.provider && (
            <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {profile.provider}
            </span>
          )}
        </div>

        {/* Info rows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("contactEmail")}
            </span>
            <span className="font-mono text-sm" {...tid("profile-contact")}>
              {contactEmail}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("memberSince")}
            </span>
            <span className="font-mono text-sm">{memberSince}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
