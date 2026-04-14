"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from "ui";

import type { DelegateWithProfile } from "@/features/seller-admins/domain/types";

const MAX_INITIALS_LENGTH = 2;
const EMPTY_STATE_CLASS = "py-8 text-center text-muted-foreground";
const DELEGATE_LIST_TID = "delegate-list";

interface DelegateListProps {
  delegates: DelegateWithProfile[];
  onRemove: (adminUserId: string) => void;
  isRemoving?: boolean;
}

export function DelegateList({
  delegates,
  onRemove,
  isRemoving,
}: DelegateListProps) {
  const t = useTranslations("sellerAdmins");

  if (delegates.length === 0) {
    return (
      <div {...tid(DELEGATE_LIST_TID)} className={EMPTY_STATE_CLASS}>
        {t("noDelegates")}
      </div>
    );
  }

  return (
    <div {...tid(DELEGATE_LIST_TID)} className="space-y-2">
      {delegates.map((delegate) => {
        const profile = delegate.admin_profile;
        const initials = (profile.display_name ?? profile.email)
          .slice(0, MAX_INITIALS_LENGTH)
          .toUpperCase();

        return (
          <div
            key={delegate.admin_user_id}
            {...tid(`delegate-item-${delegate.admin_user_id}`)}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Avatar className="size-8">
              {profile.avatar_url && (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.display_name ?? profile.email}
                />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile.display_name ?? profile.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {delegate.permissions.map((perm) => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {t(`permissions.${perm}`)}
                </Badge>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              {...tid(`delegate-remove-${delegate.admin_user_id}`)}
              onClick={() => onRemove(delegate.admin_user_id)}
              disabled={isRemoving}
              aria-label={t("removeDelegate")}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
