"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";
import { Switch } from "ui";

import type { PaymentMethodType } from "@/features/payment-method-types/domain/types";

interface PaymentMethodTypeTableProps {
  types: PaymentMethodType[];
  isLoading: boolean;
  onEdit: (type: PaymentMethodType) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const GRID_COLS = "grid-cols-[1fr_1fr_80px_100px_100px_80px_100px]";

export function PaymentMethodTypeTable({
  types,
  isLoading,
  onEdit,
  onDelete,
  onToggleActive,
}: PaymentMethodTypeTableProps) {
  const t = useTranslations("paymentMethodTypes");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  if (isLoading && types.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed border-border bg-muted/30 py-16"
        {...tid("payment-types-empty")}
      >
        <p className="font-display text-lg font-bold uppercase">
          {t("noTypes")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto border-3 border-foreground bg-background nb-shadow-md"
      {...tid("payment-types-table")}
    >
      {/* Header row */}
      <div
        className={`grid ${GRID_COLS} border-b-3 border-foreground bg-muted/50`}
      >
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("name")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("description")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("icon")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("requiresReceipt")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("requiresTransferNumber")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider">
          {t("active")}
        </span>
        <span className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wider" />
      </div>

      {/* Data rows */}
      <div className="divide-y divide-foreground/8">
        {types.map((type) => {
          const name = locale === "es" ? type.name_es : type.name_en;
          const description =
            locale === "es" ? type.description_es : type.description_en;

          return (
            <div
              key={type.id}
              className={`grid ${GRID_COLS} items-center transition-colors hover:bg-muted/30`}
              {...tid(`payment-type-row-${type.id}`)}
            >
              {/* Name */}
              <span className="truncate px-4 py-2.5 font-mono text-sm font-bold">
                {name}
              </span>

              {/* Description */}
              <span className="truncate px-4 py-2.5 text-xs text-muted-foreground">
                {description ?? "\u2014"}
              </span>

              {/* Icon */}
              <span className="px-4 py-2.5 font-mono text-xs">
                {type.icon ?? "\u2014"}
              </span>

              {/* Requires receipt */}
              <span className="px-4 py-2.5 font-mono text-xs">
                {type.requires_receipt ? "\u2713" : "\u2014"}
              </span>

              {/* Requires transfer number */}
              <span className="px-4 py-2.5 font-mono text-xs">
                {type.requires_transfer_number ? "\u2713" : "\u2014"}
              </span>

              {/* Active toggle */}
              <span className="px-4 py-2.5">
                <Switch
                  checked={type.is_active}
                  onCheckedChange={(checked: boolean) =>
                    onToggleActive(type.id, checked)
                  }
                  {...tid(`payment-type-active-${type.id}`)}
                />
              </span>

              {/* Actions */}
              <span className="flex items-center gap-1 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onEdit(type)}
                  aria-label={t("editPaymentType")}
                  className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  {...tid(`payment-type-edit-${type.id}`)}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (globalThis.confirm(t("deleteConfirm"))) {
                      onDelete(type.id);
                    }
                  }}
                  aria-label={t("deletePaymentType")}
                  className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  {...tid(`payment-type-delete-${type.id}`)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
