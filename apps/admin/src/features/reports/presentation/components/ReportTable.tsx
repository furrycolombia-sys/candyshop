"use client";

import { useTranslations } from "next-intl";

import type { ReportOrder } from "@/features/reports/domain/types";
import { OrderStatusBadge } from "@/features/reports/presentation/components/OrderStatusBadge";
import { tid } from "@/shared/infrastructure/config/tid";

const orderIdPreviewLength = 8;

interface ReportTableProps {
  orders: ReportOrder[];
}

export function ReportTable({ orders }: ReportTableProps) {
  const t = useTranslations("reports");

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
      {...tid("report-table")}
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
              {t("table.buyer")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.seller")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.product")}
            </th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
              {t("table.amount")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.currency")}
            </th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
              {t("table.transferNumber")}
            </th>
            <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
              {t("table.receipt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-foreground/5 transition-colors hover:bg-muted/30"
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
              <td className="px-3 py-2">
                <div className="text-xs">
                  <div>{order.buyer_email}</div>
                  {order.buyer_display_name && (
                    <div className="text-muted-foreground">
                      {order.buyer_display_name}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                {order.seller_email ? (
                  <div className="text-xs">
                    <div>{order.seller_email}</div>
                    {order.seller_display_name && (
                      <div className="text-muted-foreground">
                        {order.seller_display_name}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                {order.items.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {order.items.map((item) => (
                      <span key={item.id} className="text-xs">
                        {item.product_name}{" "}
                        <span className="text-muted-foreground">
                          ×{item.quantity}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {order.total.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                {order.currency}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {order.transfer_number ?? (
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-center text-xs">
                {order.receipt_url ? (
                  <a
                    href={order.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    {t("table.hasReceipt")}
                  </a>
                ) : (
                  <span className="text-muted-foreground/40">
                    {t("table.noReceipt")}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
