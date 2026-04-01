"use client";

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

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; template: ProductTemplate };

export function TemplatesPage() {
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
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("templates-page")}
    >
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
          {editor.mode === "closed" && (
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="flex items-center gap-2 border-strong border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 shadow-brutal-sm"
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
            onEdit={(template) => setEditor({ mode: "edit", template })}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleActive={(id, isActive) =>
              toggleMutation.mutate({ id, isActive })
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
