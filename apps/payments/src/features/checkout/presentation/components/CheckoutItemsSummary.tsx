"use client";

import { useTranslations } from "next-intl";
import { formatPrice, tid } from "shared";

import type { CartItem } from "@/features/checkout/domain/types";

interface CheckoutItemsSummaryProps {
  items: CartItem[];
  subtotal: number;
  currency: string;
  getItemName: (item: CartItem) => string;
}

export function CheckoutItemsSummary({
  items,
  subtotal,
  currency,
  getItemName,
}: CheckoutItemsSummaryProps) {
  const t = useTranslations("checkout");

  return (
    <div {...tid("checkout-items-summary")}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <div className="flex min-w-0 items-start gap-3">
              {item.images?.[0] && (
                <div className="size-10 shrink-0 overflow-hidden border-2 border-foreground">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external user-supplied URL */}
                  <img
                    src={item.images[0].url}
                    alt={item.images[0].alt}
                    className="size-full object-cover"
                  />
                </div>
              )}
              <span className="min-w-0 wrap-break-word font-medium">
                {getItemName(item)}{" "}
                <span className="text-muted-foreground">x{item.quantity}</span>
              </span>
            </div>
            <span className="shrink-0 pt-0.5 text-right font-bold tabular-nums">
              {formatPrice(item.price * item.quantity, item.currency)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-foreground pt-3">
        <span className="font-display text-sm font-extrabold uppercase tracking-widest">
          {t("subtotal")}
        </span>
        <span
          className="text-right font-display text-base font-extrabold tabular-nums sm:text-lg"
          {...tid("checkout-subtotal")}
        >
          {formatPrice(subtotal, currency)}
        </span>
      </div>
    </div>
  );
}
