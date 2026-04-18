"use client";

import { Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import {
  getCoverImageUrl,
  i18nCurrencyCode,
  i18nField,
  i18nPrice,
  tid,
} from "shared";

import type { CartItem } from "@/features/cart/domain/types";
import {
  getCategoryColor,
  getCategoryTheme,
} from "@/shared/domain/categoryConstants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- next-intl Translator type is complex; accepting any callable
type TranslatorFn = (...args: any[]) => string;

interface CartItemRowProps {
  item: CartItem;
  locale: string;
  tProducts: TranslatorFn;
  tTypes: TranslatorFn;
  tCategories: TranslatorFn;
  t: TranslatorFn;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
}

export function CartItemRow({
  item,
  locale,
  tProducts,
  tTypes,
  tCategories,
  t,
  removeItem,
  updateQuantity,
}: CartItemRowProps) {
  const itemColor = getCategoryColor(item.category ?? "");
  const itemTheme = getCategoryTheme(item.category ?? "merch");
  const name = i18nField(item, "name", locale);
  const lineTotal = item.price_usd * item.quantity;
  const hasReachedStockLimit =
    item.max_quantity !== null && item.quantity >= item.max_quantity;

  return (
    <li
      className="flex gap-3 border-b-strong border-foreground/10 px-5 py-4 group"
      {...tid("cart-item")}
    >
      {/* Product thumbnail */}
      <div
        className="relative size-20 shrink-0 overflow-hidden border-strong border-foreground"
        style={{ backgroundColor: itemColor }}
      >
        {(() => {
          const thumbUrl = getCoverImageUrl(item.images);
          return thumbUrl ? (
            <Image
              src={thumbUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-ui-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              {tTypes(item.type)}
            </span>
          );
        })()}
      </div>

      {/* Item details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <p
              className="font-display text-sm/tight font-bold"
              {...tid("cart-item-name")}
            >
              {name}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <span
                className="border-2 border-foreground px-1.5 py-0.5 text-ui-xs font-bold"
                style={{
                  backgroundColor: itemColor,
                  color: itemTheme.foreground,
                }}
              >
                {tCategories(item.category)}
              </span>
              <span className="border-2 border-foreground px-1.5 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
                {tTypes(item.type)}
              </span>
              {item.refundable === true && (
                <span className="border-2 border-foreground bg-success px-1.5 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-success-foreground">
                  {tProducts("refundable")}
                </span>
              )}
              {item.refundable === false && (
                <span className="border-2 border-foreground bg-warning px-1.5 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-warning-foreground">
                  {tProducts("nonRefundable")}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            onClick={() => removeItem(item.id)}
            aria-label={t("removeItem", { name })}
            {...tid("cart-item-remove")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity controls */}
          <div
            className="flex items-center border-strong border-foreground"
            {...tid("cart-item-qty")}
          >
            <button
              type="button"
              className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              aria-label={t("decreaseQty", { name })}
              {...tid("cart-item-qty-decrease")}
            >
              <Minus size={12} aria-hidden="true" />
            </button>
            <span className="border-x-strong flex size-7 items-center justify-center border-foreground text-xs font-bold">
              {item.quantity}
            </span>
            <button
              type="button"
              className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              disabled={hasReachedStockLimit}
              aria-label={t("increaseQty", { name })}
              {...tid("cart-item-qty-increase")}
            >
              <Plus size={12} aria-hidden="true" />
            </button>
          </div>

          {/* Line total */}
          <span
            className="flex shrink-0 items-baseline gap-1 font-display text-sm font-extrabold"
            {...tid("cart-item-price")}
          >
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {i18nCurrencyCode(
                {
                  price_usd: lineTotal,
                  price_cop: item.price_cop * item.quantity,
                },
                locale,
              )}
            </span>
            {i18nPrice(
              {
                ...item,
                price_usd: lineTotal,
                price_cop: item.price_cop * item.quantity,
              },
              locale,
            )}
          </span>
        </div>
      </div>
    </li>
  );
}
