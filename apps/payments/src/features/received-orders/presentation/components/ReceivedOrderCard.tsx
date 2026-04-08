"use client";

import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { i18nField, tid } from "shared";

import { ActionButtons } from "./ActionButtons";
import { ReceiptViewer } from "./ReceiptViewer";
import { ReceivedStatusBadge } from "./ReceivedStatusBadge";

import { EXPIRING_SOON_THRESHOLD_MS } from "@/features/received-orders/domain/constants";
import type {
  OrderItem,
  ReceivedOrder,
  SellerAction,
} from "@/features/received-orders/domain/types";
import { formatCop } from "@/shared/application/utils/formatCop";

/** Re-compute interval for "expiring soon" check (every minute) */
const TICK_INTERVAL_MS = 60_000;

function getItemName(item: OrderItem, locale: string): string {
  return i18nField(item.metadata, "name", locale) || item.product_id;
}

interface ReceivedOrderCardProps {
  order: ReceivedOrder;
  onAction: (orderId: string, action: SellerAction, note?: string) => void;
  isPending: boolean;
}

export function ReceivedOrderCard({
  order,
  onAction,
  isPending,
}: ReceivedOrderCardProps) {
  const t = useTranslations("receivedOrders");
  const locale = useLocale();

  const handleAction = useCallback(
    (action: SellerAction, note?: string) => {
      onAction(order.id, action, note);
    },
    [order.id, onAction],
  );

  const expiresAt = useMemo(
    () => (order.expires_at ? new Date(order.expires_at) : null),
    [order.expires_at],
  );

  const [isExpiringSoon, setIsExpiringSoon] = useState(() =>
    expiresAt === null
      ? false
      : expiresAt.getTime() - Date.now() < EXPIRING_SOON_THRESHOLD_MS,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setIsExpiringSoon(
        expiresAt.getTime() - Date.now() < EXPIRING_SOON_THRESHOLD_MS,
      );
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div
      className="border-strong border-foreground bg-background shadow-brutal-md"
      {...tid(`received-order-${order.id}`)}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-strong border-foreground p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-extrabold uppercase tracking-widest">
              {t("buyer")}: {order.buyer_name}
            </span>
            <ReceivedStatusBadge status={order.payment_status} />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
        <span className="font-display text-lg font-extrabold">
          {formatCop(order.total_cop)}
        </span>
      </div>

      {/* Items */}
      <div className="border-b-2 border-dashed border-muted-foreground/30 px-4 py-3">
        <ul className="flex flex-col gap-1">
          {order.items.map((item) => {
            const name = getItemName(item, locale);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {item.quantity}x {name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCop(item.unit_price_cop * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Receipt */}
      <div className="border-b-2 border-dashed border-muted-foreground/30 px-4 py-3">
        <ReceiptViewer
          transferNumber={order.transfer_number}
          receiptUrl={order.receipt_url}
        />
      </div>

      {/* Seller note */}
      {order.seller_note && (
        <div className="border-b-2 border-dashed border-muted-foreground/30 px-4 py-3">
          <p className="text-sm italic text-muted-foreground">
            &ldquo;{order.seller_note}&rdquo;
          </p>
        </div>
      )}

      {/* Expiration warning */}
      {expiresAt && isExpiringSoon && (
        <div className="flex items-center gap-2 border-b-2 border-dashed border-warning/30 bg-warning/5 px-4 py-2">
          <Clock className="size-4 text-warning" />
          <span className="font-display text-xs font-bold text-warning">
            {expiresAt.toLocaleString()}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <ActionButtons
          orderId={order.id}
          status={order.payment_status}
          onAction={handleAction}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
