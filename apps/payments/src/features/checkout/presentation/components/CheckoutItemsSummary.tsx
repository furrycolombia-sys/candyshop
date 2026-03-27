"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { CartItem } from "@/features/checkout/domain/types";

interface CheckoutItemsSummaryProps {
  items: CartItem[];
  subtotalCop: number;
  getItemName: (item: CartItem) => string;
}

export function CheckoutItemsSummary({
  items,
  subtotalCop,
  getItemName,
}: CheckoutItemsSummaryProps) {
  const t = useTranslations("checkout");

  return (
    <div {...tid("checkout-items-summary")}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <div className="flex items-center gap-3">
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
              <span className="font-medium">
                {getItemName(item)}{" "}
                <span className="text-muted-foreground">x{item.quantity}</span>
              </span>
            </div>
            <span className="shrink-0 font-bold tabular-nums">
              ${(item.price_cop * item.quantity).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t-2 border-foreground pt-3">
        <span className="font-display text-sm font-extrabold uppercase tracking-widest">
          {t("subtotal")}
        </span>
        <span
          className="font-display text-lg font-extrabold tabular-nums"
          {...tid("checkout-subtotal")}
        >
          ${subtotalCop.toLocaleString()} COP
        </span>
      </div>
    </div>
  );
}
