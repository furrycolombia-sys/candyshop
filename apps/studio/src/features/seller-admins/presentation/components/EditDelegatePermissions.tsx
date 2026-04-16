"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import { DELEGATE_PERMISSIONS } from "@/features/seller-admins/domain/constants";
import type {
  DelegatePermission,
  DelegateWithProfile,
} from "@/features/seller-admins/domain/types";

interface EditDelegatePermissionsProps {
  delegate: DelegateWithProfile;
  onSave: (adminUserId: string, permissions: DelegatePermission[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function EditDelegatePermissions({
  delegate,
  onSave,
  onCancel,
  isSaving,
}: EditDelegatePermissionsProps) {
  const t = useTranslations("sellerAdmins");
  const [permissions, setPermissions] = useState<Set<DelegatePermission>>(
    new Set(delegate.permissions),
  );

  const togglePermission = useCallback((perm: DelegatePermission) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (permissions.size === 0) return;
    onSave(delegate.admin_user_id, [...permissions]);
  }, [delegate.admin_user_id, permissions, onSave]);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">
        {t("editPermissionsFor", {
          name:
            delegate.admin_profile.display_name ?? delegate.admin_profile.email,
        })}
      </p>

      <fieldset className="space-y-2">
        {DELEGATE_PERMISSIONS.map((perm) => (
          <label key={perm} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...tid(`delegate-edit-permission-${perm}`)}
              checked={permissions.has(perm)}
              onChange={() => togglePermission(perm)}
            />
            {t(`permissions.${perm.replaceAll(".", "_")}`)}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={permissions.size === 0 || isSaving}
        >
          {t("savePermissions")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
