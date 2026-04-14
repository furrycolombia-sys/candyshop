"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import { useRemoveUserDelegate } from "@/features/users/application/hooks/useUserDelegates";

interface RemoveButtonProps {
  rowId: string;
  userId: string;
  canDelete: boolean;
}

export function RemoveButton({ rowId, userId, canDelete }: RemoveButtonProps) {
  const t = useTranslations("users.delegates");
  const removeMutation = useRemoveUserDelegate();
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(() => {
    removeMutation.mutate(
      { userId, delegateRowId: rowId },
      { onSettled: () => setConfirming(false) },
    );
  }, [removeMutation, userId, rowId]);

  if (!canDelete) return null;

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="destructive"
          size="sm"
          className="rounded-none border-2 border-border text-xs"
          onClick={handleConfirm}
          disabled={removeMutation.isPending}
          {...tid(`confirm-remove-delegate-${rowId}`)}
        >
          {t("confirm")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-none border-2 border-border text-xs"
          onClick={() => setConfirming(false)}
          {...tid(`cancel-remove-delegate-${rowId}`)}
        >
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-none border-2 border-border text-destructive hover:bg-destructive/10"
      onClick={() => setConfirming(true)}
      {...tid(`remove-delegate-${rowId}`)}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
