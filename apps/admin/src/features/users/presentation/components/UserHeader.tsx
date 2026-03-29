"use client";

import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { getRuntimeEnv } from "shared/config/environment";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { RoleBadge } from "./RoleBadge";

import {
  computeRole,
  formatLastSeen,
  getInitials,
} from "@/features/users/application/utils";
import type { UserProfileSummary } from "@/features/users/domain/types";

interface UserHeaderProps {
  user: UserProfileSummary;
  grantedKeys: string[];
}

export function UserHeader({ user, grantedKeys }: UserHeaderProps) {
  const t = useTranslations("users.detail");
  const tLastSeen = useTranslations("users.lastSeen");
  const locale = useLocale();
  const role = computeRole(grantedKeys);
  const avatarUrl = user.display_avatar_url ?? user.avatar_url;
  const lastSeen = formatLastSeen(user.last_seen_at);

  return (
    <div
      className="flex items-start gap-4 border-2 border-foreground bg-background p-4"
      {...tid("user-header")}
    >
      <Avatar className="size-16 rounded-none border-2 border-foreground">
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={user.display_name ?? user.email} />
        )}
        <AvatarFallback className="rounded-none bg-muted font-display text-lg font-bold">
          {getInitials(user.display_name, user.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
          {user.display_name ?? user.email}
        </h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href={`${getRuntimeEnv().authHostUrl}/${locale}/profile/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            {...tid("user-view-profile-link")}
          >
            {t("viewProfile")}
            <ExternalLink className="size-3" />
          </a>
          <RoleBadge role={role} />
          <span className="text-xs text-muted-foreground">
            {lastSeen ? tLastSeen(lastSeen.key, lastSeen.params) : "\u2014"}
          </span>
        </div>
      </div>
    </div>
  );
}
