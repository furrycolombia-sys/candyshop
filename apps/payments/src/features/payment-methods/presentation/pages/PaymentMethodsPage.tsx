"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import {
  useDeleteSellerPaymentMethod,
  useInsertSellerPaymentMethod,
  useToggleSellerPaymentMethodActive,
  useUpdateSellerPaymentMethod,
} from "@/features/payment-methods/application/hooks/usePaymentMethodMutations";
import {
  usePaymentMethodTypes,
  useSellerPaymentMethods,
} from "@/features/payment-methods/application/hooks/usePaymentMethods";
import type {
  SellerPaymentMethod,
  SellerPaymentMethodFormValues,
} from "@/features/payment-methods/domain/types";
import { PaymentMethodEditor } from "@/features/payment-methods/presentation/components/PaymentMethodEditor";
import { PaymentMethodTable } from "@/features/payment-methods/presentation/components/PaymentMethodTable";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; method: SellerPaymentMethod };

export function PaymentMethodsPage() {
  const t = useTranslations("paymentMethods");
  const tCommon = useTranslations("common");

  const { data: types, isLoading: typesLoading } = usePaymentMethodTypes();
  const { data: methods, isLoading: methodsLoading } =
    useSellerPaymentMethods();

  const insertMutation = useInsertSellerPaymentMethod();
  const updateMutation = useUpdateSellerPaymentMethod();
  const deleteMutation = useDeleteSellerPaymentMethod();
  const toggleMutation = useToggleSellerPaymentMethodActive();

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const handleEdit = useCallback((method: SellerPaymentMethod) => {
    setEditor({ mode: "edit", method });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      toggleMutation.mutate({ id, isActive });
    },
    [toggleMutation],
  );

  const handleSave = useCallback(
    (values: SellerPaymentMethodFormValues) => {
      if (editor.mode === "edit") {
        updateMutation.mutate(
          { id: editor.method.id, values },
          { onSuccess: () => setEditor({ mode: "closed" }) },
        );
      } else {
        insertMutation.mutate(values, {
          onSuccess: () => setEditor({ mode: "closed" }),
        });
      }
    },
    [editor, insertMutation, updateMutation],
  );

  const handleCancel = useCallback(() => {
    setEditor({ mode: "closed" });
  }, []);

  const isLoading = typesLoading || methodsLoading;

  const editorInitial =
    editor.mode === "edit"
      ? {
          type_id: editor.method.type_id,
          account_details_en: editor.method.account_details_en ?? "",
          account_details_es: editor.method.account_details_es ?? "",
          seller_note_en: editor.method.seller_note_en ?? "",
          seller_note_es: editor.method.seller_note_es ?? "",
          is_active: editor.method.is_active,
        }
      : undefined;

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
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1
              className="font-display text-4xl font-extrabold uppercase tracking-tight"
              {...tid("payment-methods-title")}
            >
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          {editor.mode === "closed" && (
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

        {/* Editor or Table */}
        {editor.mode === "closed" ? (
          <PaymentMethodTable
            methods={methods ?? []}
            types={types ?? []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isLoading={isLoading}
          />
        ) : (
          <PaymentMethodEditor
            types={types ?? []}
            initial={editorInitial}
            onSave={handleSave}
            onCancel={handleCancel}
            isPending={insertMutation.isPending || updateMutation.isPending}
          />
        )}
      </div>
    </main>
  );
}
