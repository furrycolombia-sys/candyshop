"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { DelegatedReportOrder } from "@/features/reports/domain/types";
import { OrderStatusBadge } from "@/features/reports/presentation/components/OrderStatusBadge";

const orderIdPreviewLength = 8;

const AMOUNT_FORMAT = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

interface DelegatedReportTableProps {
  orders: DelegatedReportOrder[];
}

export function DelegatedReportTable({ orders }: DelegatedReportTableProps) {
  const t = useTranslations("delegatedReports");

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-foreground/10 py-16 text-sm text-muted-foreground">
        {t("noResults")}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-foreground/10"
      {...tid("delegated-report-table")}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 bg-muted/50">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.orderId")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.date")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.status")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.buyerEmail")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.buyerName")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.product")}
            </th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
              {t("table.qty")}
            </th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
              {t("table.unitPrice")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.currency")}
            </th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
              {t("table.subtotal")}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.flatMap((order) =>
            order.items.map((item) => (
              <tr
                key={`${order.id}-${item.id}`}
                className="border-b border-foreground/5 transition-colors hover:bg-muted/30"
                data-product-id={item.product_id}
                {...tid("delegated-report-row")}
              >
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {order.id.slice(0, orderIdPreviewLength)}…
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <OrderStatusBadge status={order.payment_status} />
                </td>
                <td className="px-3 py-2 text-xs">{order.buyer_email}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {order.buyer_display_name ?? (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{item.product_name}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {item.quantity}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {item.unit_price.toLocaleString("en-US", AMOUNT_FORMAT)}
                </td>
                <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                  {item.currency}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {order.delegated_subtotal.toLocaleString(
                    "en-US",
                    AMOUNT_FORMAT,
                  )}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
