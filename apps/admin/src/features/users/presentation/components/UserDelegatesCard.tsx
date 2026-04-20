"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { AsDelegateRow } from "./delegates/AsDelegateRow";
import { AsSellerRow } from "./delegates/AsSellerRow";

import { useUserDelegates } from "@/features/users/application/hooks/useUserDelegates";

interface UserDelegatesCardProps {
  userId: string;
  canDelete: boolean;
}

export function UserDelegatesCard({
  userId,
  canDelete,
}: UserDelegatesCardProps) {
  const t = useTranslations("users.delegates");
  const { data, isLoading } = useUserDelegates(userId);

  const asSeller = data?.asSeller ?? [];
  const asDelegate = data?.asDelegate ?? [];
  const isEmpty = asSeller.length === 0 && asDelegate.length === 0;

  return (
    <div
      className="border-3 border-foreground bg-background p-4"
      {...tid("user-delegates-card")}
    >
      <h3 className="mb-3 flex items-center gap-2 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        <Users className="size-4" />
        {t("title")}
      </h3>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      )}

      {!isLoading && isEmpty && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {asSeller.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("asSeller")}
          </h4>
          <div className="rounded-none border border-border">
            {asSeller.map((row) => (
              <AsSellerRow
                key={row.id}
                row={row}
                userId={userId}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      )}

      {asDelegate.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("asDelegate")}
          </h4>
          <div className="rounded-none border border-border">
            {asDelegate.map((row) => (
              <AsDelegateRow
                key={row.id}
                row={row}
                userId={userId}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
