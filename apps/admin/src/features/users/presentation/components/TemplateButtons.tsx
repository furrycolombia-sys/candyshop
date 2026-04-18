"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button, cn } from "ui";

import type { TemplateKey } from "@/features/users/application/utils/templatePermissions";
import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";

interface TemplateButtonsProps {
  grantedKeys: string[];
  onToggleTemplate: (templateKey: TemplateKey, active: boolean) => void;
  onReset: () => void;
  isPending: boolean;
  canManage: boolean;
}

/** Toggle-able templates — clicking adds or removes their unique permissions. */
const TOGGLE_TEMPLATES = [
  { key: "buyer", labelKey: "templateBuyer" },
  { key: "seller", labelKey: "templateSeller" },
  { key: "admin", labelKey: "templateAdmin" },
  { key: "events", labelKey: "templateEvents" },
] as const;

/** Check if ALL keys in a template are currently granted. */
function isTemplateActive(
  templateKeys: string[],
  grantedKeys: string[],
): boolean {
  return templateKeys.every((k) => grantedKeys.includes(k));
}

export function TemplateButtons({
  grantedKeys,
  onToggleTemplate,
  onReset,
  isPending,
  canManage,
}: TemplateButtonsProps) {
  const t = useTranslations("users");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("profiles")}:
      </span>
      {TOGGLE_TEMPLATES.map(({ key, labelKey }) => {
        const templateKeys = PERMISSION_TEMPLATES[key];
        const active = isTemplateActive(templateKeys, grantedKeys);

        return (
          <Button
            key={key}
            type="button"
            onClick={() => onToggleTemplate(key, !active)}
            disabled={isPending || !canManage}
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-none border-2 border-foreground font-display text-xs font-bold uppercase tracking-wider",
              active && "bg-foreground text-background",
            )}
            {...tid(`template-btn-${key}`)}
          >
            {t(labelKey)}
          </Button>
        );
      })}
      <Button
        type="button"
        onClick={onReset}
        disabled={isPending || grantedKeys.length === 0 || !canManage}
        variant="outline"
        size="sm"
        className="rounded-none border-2 border-destructive font-display text-xs font-bold uppercase tracking-wider text-destructive"
        {...tid("template-btn-none")}
      >
        {t("templateNone")}
      </Button>
    </div>
  );
}
