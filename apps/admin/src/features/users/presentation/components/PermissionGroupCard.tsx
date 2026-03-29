"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { PERMISSION_DEPENDENCIES } from "@/features/users/domain/constants";

interface PermissionGroupCardProps {
  groupKey: string;
  labelKey: string;
  permissions: string[];
  grantedKeys: string[];
  allGrantedKeys: string[];
  onToggle: (key: string, grant: boolean) => void;
  isPending: boolean;
}

/** Extract the CRUD operation key from a permission key: "products.create" → "create" */
function getOperationKey(key: string): string {
  return key.split(".").pop() ?? key;
}

/** Extract the resource key from a permission key: "products.create" → "products" */
function getResourceKey(key: string): string {
  return key.split(".")[0];
}

export function PermissionGroupCard({
  groupKey,
  labelKey,
  permissions,
  grantedKeys,
  allGrantedKeys,
  onToggle,
  isPending,
}: PermissionGroupCardProps) {
  const t = useTranslations("userPermissions");

  // Group permissions by resource (e.g., "products", "product_images")
  const byResource = new Map<string, string[]>();
  for (const perm of permissions) {
    const resource = perm.split(".")[0];
    const existing = byResource.get(resource) ?? [];
    existing.push(perm);
    byResource.set(resource, existing);
  }

  // Check for dependency warnings
  const warnings: string[] = [];
  for (const perm of permissions) {
    const dep = PERMISSION_DEPENDENCIES[perm];
    if (dep && grantedKeys.includes(perm) && !allGrantedKeys.includes(dep)) {
      warnings.push(t("dependencyWarning", { permission: dep }));
    }
  }

  return (
    <div
      className="border-3 border-foreground bg-background p-4"
      {...tid(`permission-group-${groupKey}`)}
    >
      <h3 className="mb-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t(labelKey)}
      </h3>

      <div className="space-y-2">
        {[...byResource.entries()].map(([resource, perms]) => (
          <div
            key={resource}
            className="flex flex-wrap items-center gap-x-4 gap-y-1"
          >
            <span className="w-32 shrink-0 text-xs font-medium text-muted-foreground">
              {t(`resources.${getResourceKey(perms[0])}`)}
            </span>
            {perms.map((perm) => {
              const isGranted = grantedKeys.includes(perm);
              return (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-1.5"
                >
                  <input
                    type="checkbox"
                    checked={isGranted}
                    onChange={() => onToggle(perm, !isGranted)}
                    disabled={isPending}
                    className="size-4 accent-foreground"
                    {...tid(`permission-toggle-${perm}`)}
                  />
                  <span className="text-xs">
                    {t(`operations.${getOperationKey(perm)}`)}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <div className="space-y-0.5">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
