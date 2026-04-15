"use client";

import { useTranslations } from "next-intl";

export function PermissionBadges({ permissions }: { permissions: string[] }) {
  const t = useTranslations("users.delegates");
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map((perm) => (
        <span
          key={perm}
          className="rounded-none border border-border bg-muted px-1.5 py-0.5 text-ui-xs"
        >
          {t(`perm.${perm}` as Parameters<typeof t>[0])}
        </span>
      ))}
    </div>
  );
}
