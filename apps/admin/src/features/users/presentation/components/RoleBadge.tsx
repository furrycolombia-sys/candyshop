"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { UserRole } from "@/features/users/domain/types";

const ROLE_STYLES: Record<UserRole, string> = {
  admin: "border-destructive bg-destructive/10 text-destructive",
  seller: "border-primary bg-primary/10 text-primary",
  buyer: "border-info bg-info/10 text-info",
  custom: "border-warning bg-warning/10 text-warning",
  none: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const t = useTranslations("users.roles");

  return (
    <span
      className={`inline-flex items-center rounded-none border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${ROLE_STYLES[role]}`}
      {...tid(`role-badge-${role}`)}
    >
      {t(role)}
    </span>
  );
}
