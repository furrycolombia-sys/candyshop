"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";

interface TemplateButtonsProps {
  onApply: (permissionKeys: string[]) => void;
  isPending: boolean;
}

const TEMPLATES = [
  { key: "buyer", labelKey: "templateBuyer" },
  { key: "seller", labelKey: "templateSeller" },
  { key: "admin", labelKey: "templateAdmin" },
  { key: "none", labelKey: "templateNone" },
] as const;

export function TemplateButtons({ onApply, isPending }: TemplateButtonsProps) {
  const t = useTranslations("userPermissions");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("applyTemplate")}:
      </span>
      {TEMPLATES.map(({ key, labelKey }) => (
        <Button
          key={key}
          type="button"
          onClick={() => onApply(PERMISSION_TEMPLATES[key])}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="rounded-none border-2 border-foreground font-display text-xs font-bold uppercase tracking-wider"
          {...tid(`template-btn-${key}`)}
        >
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
