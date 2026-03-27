"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import {
  useDeletePaymentMethodType,
  useInsertPaymentMethodType,
  useTogglePaymentMethodTypeActive,
  useUpdatePaymentMethodType,
} from "@/features/payment-method-types/application/hooks/usePaymentMethodTypeMutations";
import { usePaymentMethodTypes } from "@/features/payment-method-types/application/hooks/usePaymentMethodTypes";
import type {
  PaymentMethodType,
  PaymentMethodTypeFormValues,
} from "@/features/payment-method-types/domain/types";
import { PaymentMethodTypeEditor } from "@/features/payment-method-types/presentation/components/PaymentMethodTypeEditor";
import { PaymentMethodTypeTable } from "@/features/payment-method-types/presentation/components/PaymentMethodTypeTable";

type EditorState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; paymentType: PaymentMethodType };

export function PaymentMethodTypesPage() {
  const t = useTranslations("paymentMethodTypes");
  const { data: types, isLoading } = usePaymentMethodTypes();
  const insertMutation = useInsertPaymentMethodType();
  const updateMutation = useUpdatePaymentMethodType();
  const deleteMutation = useDeletePaymentMethodType();
  const toggleMutation = useTogglePaymentMethodTypeActive();

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const handleSave = (values: PaymentMethodTypeFormValues) => {
    if (editor.mode === "create") {
      insertMutation.mutate(values, {
        onSuccess: () => setEditor({ mode: "closed" }),
      });
    } else if (editor.mode === "edit") {
      updateMutation.mutate(
        { id: editor.paymentType.id, values },
        { onSuccess: () => setEditor({ mode: "closed" }) },
      );
    }
  };

  const isSaving = insertMutation.isPending || updateMutation.isPending;

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
      {...tid("payment-types-page")}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1
              className="font-display text-4xl font-extrabold uppercase tracking-tight"
              {...tid("payment-types-title")}
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
              className="flex items-center gap-2 border-3 border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-foreground/90 nb-shadow-sm"
              {...tid("payment-types-add")}
            >
              <Plus className="size-4" strokeWidth={3} />
              {t("addType")}
            </button>
          )}
        </header>

        {/* Editor or Table */}
        {editor.mode === "closed" ? (
          <PaymentMethodTypeTable
            types={types ?? []}
            isLoading={isLoading}
            onEdit={(paymentType) => setEditor({ mode: "edit", paymentType })}
            onDelete={(id) => deleteMutation.mutate(id)}
            onToggleActive={(id, isActive) =>
              toggleMutation.mutate({ id, isActive })
            }
          />
        ) : (
          <PaymentMethodTypeEditor
            initial={
              editor.mode === "edit"
                ? {
                    name_en: editor.paymentType.name_en,
                    name_es: editor.paymentType.name_es,
                    description_en: editor.paymentType.description_en ?? "",
                    description_es: editor.paymentType.description_es ?? "",
                    icon: editor.paymentType.icon ?? "",
                    requires_receipt: editor.paymentType.requires_receipt,
                    requires_transfer_number:
                      editor.paymentType.requires_transfer_number,
                    is_active: editor.paymentType.is_active,
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
