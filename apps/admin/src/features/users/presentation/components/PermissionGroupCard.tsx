"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

interface PermissionGroupCardProps {
  groupKey: string;
  labelKey: string;
  permissions: string[];
  grantedKeys: string[];
  onToggle: (key: string, grant: boolean) => void;
  isPending: boolean;
  canManage: boolean;
}

export function PermissionGroupCard({
  groupKey,
  labelKey,
  permissions,
  grantedKeys,
  onToggle,
  isPending,
  canManage,
}: PermissionGroupCardProps) {
  const t = useTranslations("users");
  const tp = useTranslations("permissions");
  const th = useTranslations("permissionHints");

  return (
    <div
      className="border-3 border-foreground bg-background p-4"
      {...tid(`permission-group-${groupKey}`)}
    >
      <h3 className="mb-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t(`groups.${labelKey}`)}
      </h3>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {permissions.map((perm) => {
          const isGranted = grantedKeys.includes(perm);
          return (
            <label
              key={perm}
              className="flex cursor-pointer items-center gap-1.5"
              title={th(perm)}
            >
              <input
                type="checkbox"
                checked={isGranted}
                onChange={() => onToggle(perm, !isGranted)}
                disabled={isPending || !canManage}
                className="size-4 accent-foreground"
                {...tid(`permission-toggle-${perm}`)}
              />
              <span className="text-xs">{tp(perm)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
