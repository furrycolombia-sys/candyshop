/* eslint-disable i18next/no-literal-string -- alt text and buyer info labels are dynamic/internal, not user-facing UI strings */
/* eslint-disable @next/next/no-img-element -- dynamic user-uploaded images, no Next.js Image optimization needed */
/* eslint-disable react/no-multi-comp -- BuyerInfoValue is a private helper co-located with its parent */
"use client";

import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { tid } from "shared";

import { ActionButtons } from "./ActionButtons";
import { ReceiptViewer } from "./ReceiptViewer";
import { ReceivedStatusBadge } from "./ReceivedStatusBadge";

import { EXPIRING_SOON_THRESHOLD_MS } from "@/features/received-orders/domain/constants";
import type {
  ReceivedOrder,
  SellerAction,
} from "@/features/received-orders/domain/types";
import { formatPrice } from "@/shared/application/utils/formatPrice";
import { getItemName } from "@/shared/domain/orderUtils";

/** Re-compute interval for "expiring soon" check (every minute) */
const TICK_INTERVAL_MS = 60_000;

function isUrl(value: string): boolean {
  return value.startsWith("https://");
}

function isImageUrl(value: string): boolean {
  return isUrl(value) && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(value);
}

function BuyerInfoValue({ value }: { value: string }) {
  if (isImageUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={value}
          alt="Uploaded file"
          className="max-h-32 max-w-xs rounded-sm border border-border object-contain"
        />
      </a>
    );
  }
  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-primary underline underline-offset-2 hover:opacity-80 break-all"
      >
        {value}
      </a>
    );
  }
  return <span className="font-mono text-xs break-all">{value}</span>;
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

  const [isExpiringSoon, setIsExpiringSoon] = useState(() => {
    const d = order.expires_at ? new Date(order.expires_at) : null;
    return d === null
      ? false
      : d.getTime() - Date.now() < EXPIRING_SOON_THRESHOLD_MS;
  });

  const expiresAt = useMemo(
    () => (order.expires_at ? new Date(order.expires_at) : null),
    [order.expires_at],
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

  const handleAction = useCallback(
    (action: SellerAction, note?: string) => {
      onAction(order.id, action, note);
    },
    [order.id, onAction],
  );

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
          {order.seller_name && (
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-display text-xs font-bold text-muted-foreground">
              {t("onBehalfOf", { sellerName: order.seller_name })}
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
        <span className="font-display text-lg font-extrabold">
          {formatPrice(order.total, order.currency)}
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
                  {formatPrice(item.unit_price * item.quantity, item.currency)}
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

      {/* Buyer info (e.g. Nequi fields) */}
      {order.buyer_info && Object.keys(order.buyer_info).length > 0 && (
        <div className="border-b-2 border-dashed border-muted-foreground/30 px-4 py-3 space-y-1">
          {Object.entries(order.buyer_info).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-24 pt-0.5">
                {key}
              </span>
              <BuyerInfoValue value={value} />
            </div>
          ))}
        </div>
      )}

      {/* Seller note */}
      {order.seller_note && (
        <div className="border-b-2 border-dashed border-muted-foreground/30 px-4 py-3">
          <p className="text-sm italic text-muted-foreground">
            &ldquo;{order.seller_note}&rdquo;
          </p>
        </div>
      )}

      {/* Expiration warning — only relevant while the order is still pending */}
      {expiresAt && isExpiringSoon && order.payment_status === "pending" && (
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
          canManage={order.can_manage ?? true}
        />
      </div>
    </div>
  );
}
