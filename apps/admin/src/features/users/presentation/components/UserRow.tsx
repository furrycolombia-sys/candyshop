"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { RoleBadge } from "./RoleBadge";

import {
  formatLastSeen,
  getInitials,
} from "@/features/users/application/utils";
import type {
  UserProfileSummary,
  UserRole,
} from "@/features/users/domain/types";

interface UserRowProps {
  user: UserProfileSummary;
  role: UserRole;
  onClick: (userId: string) => void;
}

export function UserRow({ user, role, onClick }: UserRowProps) {
  const t = useTranslations("users.lastSeen");
  const avatarUrl = user.display_avatar_url ?? user.avatar_url;
  const lastSeen = formatLastSeen(user.last_seen_at);

  return (
    <tr
      className="cursor-pointer border-b border-foreground/10 transition-colors hover:bg-muted/30"
      onClick={() => onClick(user.id)}
      {...tid(`user-row-${user.id}`)}
    >
      <td className="px-4 py-3">
        <Avatar className="size-8 rounded-none border-2 border-foreground">
          {avatarUrl && (
            <AvatarImage
              src={avatarUrl}
              alt={user.display_name ?? user.email}
            />
          )}
          <AvatarFallback className="rounded-none bg-muted font-display text-xs font-bold">
            {getInitials(user.display_name, user.email)}
          </AvatarFallback>
        </Avatar>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{user.email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {user.display_name ?? "\u2014"}
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={role} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {lastSeen ? t(lastSeen.key, lastSeen.params) : "\u2014"}
      </td>
    </tr>
  );
}
