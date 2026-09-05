"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { cn } from "ui";

import type { UserRole } from "@/features/users/domain/types";

/**
 * Colour lives in the border and the background tint; the text does not carry
 * it.
 *
 * Every role used to be `border-X bg-X/10 text-X` -- the colour on a 10% tint
 * of itself. axe measured the seller badge at 3.2:1 against a required 4.5:1,
 * and seller was only the one that appeared because it is what the seeded data
 * happened to contain: the same shape would have failed for any of them.
 *
 * text-foreground on a near-white tint is well clear of the threshold, and the
 * badge still reads as its role because the border and fill still carry the
 * colour.
 */
const ROLE_STYLES: Record<UserRole, string> = {
  admin: "border-destructive bg-destructive/10 text-foreground",
  seller: "border-primary bg-primary/10 text-foreground",
  buyer: "border-info bg-info/10 text-foreground",
  custom: "border-warning bg-warning/10 text-foreground",
  none: "border-muted-foreground/30 bg-muted text-foreground",
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const t = useTranslations("users.roles");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider",
        ROLE_STYLES[role],
      )}
      data-variant={role}
      {...tid(`role-badge-${role}`)}
    >
      {t(role)}
    </span>
  );
}
