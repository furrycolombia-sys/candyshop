"use client";

import { LayoutTemplate } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { i18nField, tid } from "shared";
import type { ProductSection } from "shared/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui";

import { useProductTemplates } from "@/features/products/application/hooks/useProductTemplates";

interface TemplatePickerProps {
  onApply: (sections: ProductSection[]) => void;
  hasSections: boolean;
}

export function TemplatePicker({ onApply, hasSections }: TemplatePickerProps) {
  const t = useTranslations("form.inlineEditor");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: templates, isLoading } = useProductTemplates();

  const handleApply = useCallback(
    (sections: ProductSection[]) => {
      if (hasSections && !globalThis.confirm(t("templateConfirm"))) return;
      onApply(structuredClone(sections));
    },
    [hasSections, onApply, t],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border-2 border-background/30 px-2.5 py-1 font-display text-ui-xs font-bold uppercase tracking-wider text-background/70 transition-colors hover:border-background hover:text-background"
          {...tid("toolbar-use-template")}
        >
          <LayoutTemplate className="size-3.5" />
          {t("useTemplate")}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 border-strong border-foreground p-1"
        {...tid("template-picker-popover")}
      >
        {isLoading && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {tCommon("loading")}
          </div>
        )}

        {!isLoading && (!templates || templates.length === 0) && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {t("noTemplates")}
          </div>
        )}

        {templates?.map((template) => {
          const name = i18nField(template, "name", locale);
          const description = i18nField(template, "description", locale);

          return (
            <DropdownMenuItem
              key={template.id}
              onClick={() => handleApply(template.sections)}
              className="flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-3 py-2"
              {...tid(`template-option-${template.id}`)}
            >
              <span className="font-display text-sm font-bold">{name}</span>
              {description && (
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              )}
              <span className="text-ui-xs text-muted-foreground">
                {template.sections.length}{" "}
                {template.sections.length === 1
                  ? t("templateSectionSingular")
                  : t("templateSectionPlural")}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
