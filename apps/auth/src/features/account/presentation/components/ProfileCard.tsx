"use client";

/* eslint-disable @next/next/no-img-element */
import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { UserProfile } from "@/features/account/domain/types";

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const t = useTranslations("auth.accountSettings");

  const memberSince = new Date(profile.first_seen_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );

  return (
    <div
      className="border-3 border-foreground bg-background p-6 nb-shadow-sm"
      {...tid("profile-card")}
    >
      <h2 className="mb-4 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t("authInfo")}
      </h2>

      <div className="flex items-center gap-4">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-14 rounded-full border-3 border-foreground"
          />
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("loginEmail")}
            </span>
            <span className="font-mono text-sm" {...tid("profile-email")}>
              {profile.email}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("provider")}
            </span>
            <span
              className="font-mono text-sm capitalize"
              {...tid("profile-provider")}
            >
              {profile.provider ?? "email"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              {t("memberSince")}
            </span>
            <span className="font-mono text-sm">{memberSince}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
