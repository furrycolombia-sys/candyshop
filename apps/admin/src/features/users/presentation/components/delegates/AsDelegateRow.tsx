"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { PermissionBadges } from "./PermissionBadges";
import { ProductName } from "./ProductName";
import { RemoveButton } from "./RemoveButton";

import type { DelegateAsDelegate } from "@/features/users/application/hooks/useUserDelegates";

interface AsDelegateRowProps {
  row: DelegateAsDelegate;
  userId: string;
  canDelete: boolean;
}

export function AsDelegateRow({ row, userId, canDelete }: AsDelegateRowProps) {
  const profile = row.seller_profile;
  const t = useTranslations("users.delegates");
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2 last:border-b-0"
      {...tid(`delegate-as-delegate-${row.id}`)}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("delegatedBy")}</span>
          <span className="font-medium">
            {profile.display_name ?? profile.email}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ProductName product={row.product} />
        </div>
        <PermissionBadges permissions={row.permissions} />
      </div>
      <RemoveButton rowId={row.id} userId={userId} canDelete={canDelete} />
    </div>
  );
}
