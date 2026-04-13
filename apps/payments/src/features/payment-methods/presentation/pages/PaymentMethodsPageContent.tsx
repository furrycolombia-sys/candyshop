/* eslint-disable i18next/no-literal-string -- aria-labels and language code labels are UI chrome, not user-facing content */
/* eslint-disable react/no-multi-comp -- CreateMethodForm is a private helper co-located with its parent */
"use client";

import { useSupabaseAuth } from "auth/client";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { i18nField, tid } from "shared";
import { Button, Switch } from "ui";

import {
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  useUpdatePaymentMethod,
} from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import { usePaymentMethods } from "@/features/payment-methods/application/hooks/usePaymentMethods";
import type { SellerPaymentMethod } from "@/features/payment-methods/domain/types";
import { PaymentMethodEditor } from "@/features/payment-methods/presentation/components/PaymentMethodEditor";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; method: SellerPaymentMethod };

interface PaymentMethodsPageContentProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function PaymentMethodsPageContent({
  canCreate,
  canUpdate,
  canDelete,
}: PaymentMethodsPageContentProps) {
  const t = useTranslations("paymentMethods");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useSupabaseAuth();

  const sellerId = user?.id ?? "";
  const { data: methods, isLoading } = usePaymentMethods(sellerId);

  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const handleEdit = useCallback((method: SellerPaymentMethod) => {
    setEditor({ mode: "edit", method });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (globalThis.confirm(t("deleteConfirm"))) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation, t],
  );

  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      updateMutation.mutate({ id, patch: { is_active: isActive } });
    },
    [updateMutation],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (!methods || index === 0) return;
      const current = methods[index];
      const prev = methods[index - 1];
      updateMutation.mutate({
        id: current.id,
        patch: { sort_order: prev.sort_order },
      });
      updateMutation.mutate({
        id: prev.id,
        patch: { sort_order: current.sort_order },
      });
    },
    [methods, updateMutation],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (!methods || index === methods.length - 1) return;
      const current = methods[index];
      const next = methods[index + 1];
      updateMutation.mutate({
        id: current.id,
        patch: { sort_order: next.sort_order },
      });
      updateMutation.mutate({
        id: next.id,
        patch: { sort_order: current.sort_order },
      });
    },
    [methods, updateMutation],
  );

  const handleCreate = useCallback(
    (nameEn: string, nameEs?: string) => {
      createMutation.mutate(
        { sellerId, nameEn, nameEs },
        { onSuccess: (method) => setEditor({ mode: "edit", method }) },
      );
    },
    [createMutation, sellerId],
  );

  const handleEditorClose = useCallback(() => {
    setEditor({ mode: "closed" });
  }, []);

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col surface-grid-dots">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
          <p className="text-muted-foreground">{tCommon("loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col surface-grid-dots"
      {...tid("payment-methods-page")}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          {editor.mode === "closed" && canCreate && (
            <Button
              type="button"
              className="button-brutal shadow-brutal-md button-press-sm rounded-xl border-strong bg-brand px-6 py-3 text-brand-foreground hover:bg-brand-hover"
              onClick={() => setEditor({ mode: "create" })}
              {...tid("add-payment-method-button")}
            >
              <Plus className="size-5" />
              {t("addMethod")}
            </Button>
          )}
        </header>

        {/* Create flow */}
        {editor.mode === "create" && (
          <CreateMethodForm
            onCreate={handleCreate}
            onCancel={handleEditorClose}
            isPending={createMutation.isPending}
          />
        )}

        {/* Edit flow */}
        {editor.mode === "edit" && (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="self-start rounded-xl border-strong px-4 py-2 text-sm"
              onClick={handleEditorClose}
              {...tid("back-to-list")}
            >
              ← {t("cancel")}
            </Button>
            <PaymentMethodEditor
              method={editor.method}
              onClose={handleEditorClose}
            />
          </div>
        )}

        {/* List */}
        {editor.mode === "closed" && (
          <>
            {!methods || methods.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-strong border-dashed border-border bg-muted/30 py-16"
                {...tid("payment-methods-empty-state")}
              >
                <p className="font-display text-lg font-bold uppercase">
                  {t("noMethods")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("noMethodsHint")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {methods.map((method, index) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 rounded-xl border-strong border-border bg-background p-4 shadow-brutal-sm"
                    {...tid("payment-method-row")}
                  >
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveUp(index)}
                        className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                        {...tid(`payment-method-up-${method.id}`)}
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={index === (methods?.length ?? 0) - 1}
                        onClick={() => handleMoveDown(index)}
                        className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                        {...tid(`payment-method-down-${method.id}`)}
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-display text-sm font-bold uppercase tracking-wide truncate"
                        {...tid("payment-method-name")}
                      >
                        {i18nField(method, "name", locale) || method.name_en}
                      </p>
                    </div>

                    {/* Active toggle */}
                    {canUpdate && (
                      <Switch
                        checked={method.is_active}
                        onCheckedChange={(checked: boolean) =>
                          handleToggleActive(method.id, checked)
                        }
                        {...tid("payment-method-active-toggle")}
                      />
                    )}

                    {/* Edit button */}
                    {canUpdate && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg border-strong px-3 py-1.5 text-xs"
                        onClick={() => handleEdit(method)}
                        {...tid("payment-method-edit")}
                      >
                        {t("editMethod")}
                      </Button>
                    )}

                    {/* Delete button */}
                    {canDelete && (
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("removeMethod")}
                        onClick={() => handleDelete(method.id)}
                        {...tid("payment-method-delete")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ─── Create Method Form ───────────────────────────────────────────────────────

interface CreateMethodFormProps {
  onCreate: (nameEn: string, nameEs?: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function CreateMethodForm({
  onCreate,
  onCancel,
  isPending,
}: CreateMethodFormProps) {
  const t = useTranslations("paymentMethods");
  const [nameEn, setNameEn] = useState("");
  const [nameEs, setNameEs] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!nameEn.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setError(null);
    onCreate(nameEn.trim(), nameEs.trim() || undefined);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border-strong border-border bg-background p-6 shadow-brutal-md">
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">
        {t("addMethod")}
      </h2>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="create-method-name-en"
          className="text-sm font-semibold"
        >
          Name (EN) *
        </label>
        <input
          id="create-method-name-en"
          type="text"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...tid("payment-method-name-en")}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="create-method-name-es"
          className="text-sm font-semibold"
        >
          Name (ES)
        </label>
        <input
          id="create-method-name-es"
          type="text"
          value={nameEs}
          onChange={(e) => setNameEs(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...tid("payment-method-name-es")}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          className="button-brutal shadow-brutal-md button-press-sm rounded-xl border-strong bg-brand px-6 py-3 text-brand-foreground hover:bg-brand-hover"
          disabled={isPending}
          onClick={handleSubmit}
          {...tid("create-method-save")}
        >
          {isPending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-strong px-6 py-3"
          onClick={onCancel}
          {...tid("create-method-cancel")}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
