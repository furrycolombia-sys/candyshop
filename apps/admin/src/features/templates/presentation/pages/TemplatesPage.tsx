/* eslint-disable react/no-multi-comp */
"use client";

import { useCurrentUserPermissions } from "auth/client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import {
  useDeleteTemplate,
  useInsertTemplate,
  useToggleTemplateActive,
  useUpdateTemplate,
} from "@/features/templates/application/hooks/useTemplateMutations";
import { useTemplates } from "@/features/templates/application/hooks/useTemplates";
import type {
  ProductTemplate,
  TemplateFormValues,
} from "@/features/templates/domain/types";
import { TemplateEditor } from "@/features/templates/presentation/components/TemplateEditor";
import { TemplateTable } from "@/features/templates/presentation/components/TemplateTable";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; template: ProductTemplate };

function TemplatesPageContent({
  canCreate,
  canUpdate,
  canDelete,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("templates");
  const { data: templates, isLoading } = useTemplates();
  const insertMutation = useInsertTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const toggleMutation = useToggleTemplateActive();

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const handleSave = (values: TemplateFormValues) => {
    if (editor.mode === "create") {
      insertMutation.mutate(values, {
        onSuccess: () => setEditor({ mode: "closed" }),
      });
    } else if (editor.mode === "edit") {
      updateMutation.mutate(
        { id: editor.template.id, values },
        { onSuccess: () => setEditor({ mode: "closed" }) },
      );
    }
  };

  const isSaving = insertMutation.isPending || updateMutation.isPending;

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("templates-page")}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1
              className="font-display text-4xl font-extrabold uppercase tracking-tight"
              {...tid("templates-title")}
            >
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          {editor.mode === "closed" && canCreate && (
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="flex items-center gap-2 border-3 border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 nb-shadow-sm"
              {...tid("templates-add")}
            >
              <Plus className="size-4" strokeWidth={3} />
              {t("addTemplate")}
            </button>
          )}
        </header>

        {/* Editor or Table */}
        {editor.mode === "closed" ? (
          <TemplateTable
            templates={templates ?? []}
            isLoading={isLoading}
            onEdit={
              canUpdate
                ? (template) => setEditor({ mode: "edit", template })
                : undefined
            }
            onDelete={canDelete ? (id) => deleteMutation.mutate(id) : undefined}
            onToggleActive={
              canUpdate
                ? (id, isActive) => toggleMutation.mutate({ id, isActive })
                : undefined
            }
          />
        ) : (
          <TemplateEditor
            initial={
              editor.mode === "edit"
                ? {
                    name_en: editor.template.name_en,
                    name_es: editor.template.name_es,
                    description_en: editor.template.description_en ?? "",
                    description_es: editor.template.description_es ?? "",
                    sections: editor.template.sections,
                    sort_order: editor.template.sort_order,
                    is_active: editor.template.is_active,
                  }
                : undefined
            }
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={() => setEditor({ mode: "closed" })}
          />
        )}
      </div>
    </main>
  );
}

export function TemplatesPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) return null;
  if (!hasPermission("templates.read")) {
    return <AccessDeniedState />;
  }

  return (
    <TemplatesPageContent
      canCreate={hasPermission("templates.create")}
      canUpdate={hasPermission("templates.update")}
      canDelete={hasPermission("templates.delete")}
    />
  );
}
