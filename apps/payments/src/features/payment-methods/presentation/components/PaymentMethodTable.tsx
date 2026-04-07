"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { Skeleton, Switch } from "ui";

import type {
  PaymentMethodType,
  SellerPaymentMethod,
} from "@/features/payment-methods/domain/types";
import { getPaymentTypeName } from "@/features/payment-methods/domain/utils";

const TABLE_HEADER_CLASS = "text-table-header px-4 py-3";
const ZEBRA_MODULO = 2;
const SKELETON_ROWS = 3;

interface PaymentMethodTableProps {
  methods: SellerPaymentMethod[];
  types: PaymentMethodType[];
  onEdit?: (method: SellerPaymentMethod) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  isLoading: boolean;
}

export function PaymentMethodTable({
  methods,
  types,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading,
}: PaymentMethodTableProps) {
  const t = useTranslations("paymentMethods");
  const locale = useLocale();

  const getTypeName = (typeId: string): string =>
    getPaymentTypeName(types, typeId, locale);

  if (isLoading) {
    return (
      <div
        className="overflow-x-auto rounded-xl border-3 border-border bg-background nb-shadow-md"
        {...tid("payment-methods-table-loading")}
      >
        <div className="flex flex-col gap-4 p-6">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key -- static skeleton placeholders
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed border-border bg-muted/30 py-16"
        {...tid("payment-methods-empty-state")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("noMethods")}
        </p>
        <p className="text-sm text-muted-foreground">{t("noMethodsHint")}</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border-3 border-border bg-background nb-shadow-md"
      {...tid("payment-methods-table")}
    >
      <table className="w-full">
        <thead>
          <tr className="border-b-3 border-border bg-muted/50">
            <th className={`${TABLE_HEADER_CLASS} text-left`}>
              {t("selectType")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-center`}>
              {t("active")}
            </th>
            <th className={`${TABLE_HEADER_CLASS} text-right`}>
              <span className="sr-only">{t("editPaymentMethod")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {methods.map((method, index) => (
            <tr
              key={method.id}
              className={`border-b border-border last:border-b-0 ${index % ZEBRA_MODULO === 1 ? "bg-muted/20" : ""}`}
              {...tid(`payment-method-row-${method.id}`)}
            >
              <td className="px-4 py-3 text-sm font-medium">
                {getTypeName(method.type_id)}
              </td>
              <td className="px-4 py-3 text-center">
                {onToggleActive ? (
                  <Switch
                    checked={method.is_active}
                    onCheckedChange={(checked: boolean) =>
                      onToggleActive(method.id, checked)
                    }
                    {...tid(`payment-method-active-${method.id}`)}
                  />
                ) : (
                  <span className="font-mono text-xs">
                    {method.is_active ? "on" : "off"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {onEdit && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={t("editPaymentMethod")}
                      onClick={() => onEdit(method)}
                      {...tid(`payment-method-edit-${method.id}`)}
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t("removeMethod")}
                      onClick={() => {
                        if (globalThis.confirm(t("deleteConfirm"))) {
                          onDelete(method.id);
                        }
                      }}
                      {...tid(`payment-method-delete-${method.id}`)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
