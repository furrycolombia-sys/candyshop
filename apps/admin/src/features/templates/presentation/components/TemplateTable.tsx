"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { Switch } from "ui";

import type { ProductTemplate } from "@/features/templates/domain/types";

interface TemplateTableProps {
  templates: ProductTemplate[];
  isLoading: boolean;
  onEdit?: (template: ProductTemplate) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export function TemplateTable({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
}: TemplateTableProps) {
  const t = useTranslations("templates");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-strong border-dashed border-border bg-muted/30 py-16"
        {...tid("templates-empty")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("noTemplates")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto border-strong border-foreground bg-background shadow-brutal-md"
      {...tid("templates-table")}
    >
      {/* Header row */}
      <div className="grid grid-cols-[1fr_1fr_100px_80px_100px] border-b-strong border-foreground bg-muted/50">
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("name")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("description")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("sections")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("active")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider" />
      </div>

      {/* Data rows */}
      <div className="divide-y divide-foreground/8">
        {templates.map((template) => {
          const name = locale === "es" ? template.name_es : template.name_en;
          const description =
            locale === "es" ? template.description_es : template.description_en;

          return (
            <div
              key={template.id}
              className="grid grid-cols-[1fr_1fr_100px_80px_100px] items-center transition-colors hover:bg-muted/30"
              {...tid(`template-row-${template.id}`)}
            >
              {/* Name */}
              <span className="truncate px-4 py-2.5 font-mono text-sm font-bold">
                {name}
              </span>

              {/* Description */}
              <span className="truncate px-4 py-2.5 text-xs text-muted-foreground">
                {description ?? "—"}
              </span>

              {/* Section count */}
              <span className="px-4 py-2.5 font-mono text-xs">
                {t("sectionCount", { count: template.sections.length })}
              </span>

              {/* Active toggle */}
              <span className="px-4 py-2.5">
                {onToggleActive ? (
                  <Switch
                    checked={template.is_active}
                    onCheckedChange={(checked: boolean) =>
                      onToggleActive(template.id, checked)
                    }
                    {...tid(`template-active-${template.id}`)}
                  />
                ) : (
                  <span className="font-mono text-xs">
                    {template.is_active ? "on" : "off"}
                  </span>
                )}
              </span>

              {/* Actions */}
              <span className="flex items-center gap-1 px-4 py-2.5">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(template)}
                    aria-label={t("editTemplate")}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    {...tid(`template-edit-${template.id}`)}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalThis.confirm(t("deleteConfirm"))) {
                        onDelete(template.id);
                      }
                    }}
                    aria-label={t("deleteTemplate")}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    {...tid(`template-delete-${template.id}`)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
