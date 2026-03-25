import { Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { i18nField, i18nPrice, tid } from "shared";

import type { CartItem } from "@/features/cart/domain/types";
import { getCategoryColor } from "@/shared/domain/categoryConstants";

interface CartItemRowProps {
  item: CartItem;
  locale: string;
  tProducts: (key: string) => string;
  tTypes: (key: string) => string;
  tCategories: (key: string) => string;
  t: (key: string, values?: Record<string, unknown>) => string;
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
  const name = i18nField(item, "name", locale);
  const lineTotal = item.price_usd * item.quantity;

  return (
    <li
      className="flex gap-3 border-b-3 border-foreground/10 px-5 py-4 group"
      {...tid("cart-item")}
    >
      {/* Product thumbnail */}
      <div
        className={`relative size-20 shrink-0 border-3 border-foreground overflow-hidden ${itemColor}`}
      >
        {Array.isArray(item.images) &&
        item.images.length > 0 &&
        typeof (item.images[0] as { url?: string })?.url === "string" ? (
          <Image
            src={(item.images[0] as { url: string }).url}
            alt={name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <span className="flex size-full items-center justify-center font-display text-tiny font-extrabold uppercase tracking-widest text-foreground/30">
            {tTypes(item.type)}
          </span>
        )}
      </div>

      {/* Item details */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
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
                className={`${itemColor} border-2 border-foreground px-1.5 py-0.5 text-[9px] font-bold text-foreground`}
              >
                {tCategories(item.category)}
              </span>
              <span className="border-2 border-foreground px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                {tTypes(item.type)}
              </span>
              {item.refundable === true && (
                <span className="bg-mint border-2 border-foreground px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("refundable")}
                </span>
              )}
              {item.refundable === false && (
                <span className="bg-peach border-2 border-foreground px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-foreground">
                  {tProducts("nonRefundable")}
                </span>
              )}
            </div>
          </div>
          <button
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
            className="flex items-center border-3 border-foreground"
            {...tid("cart-item-qty")}
          >
            <button
              className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              aria-label={t("decreaseQty", { name })}
              {...tid("cart-item-qty-decrease")}
            >
              <Minus size={12} aria-hidden="true" />
            </button>
            <span className="flex size-7 items-center justify-center border-x-[3px] border-foreground text-xs font-bold">
              {item.quantity}
            </span>
            <button
              className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              aria-label={t("increaseQty", { name })}
              {...tid("cart-item-qty-increase")}
            >
              <Plus size={12} aria-hidden="true" />
            </button>
          </div>

          {/* Line total */}
          <span
            className="font-display text-sm font-extrabold"
            {...tid("cart-item-price")}
          >
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
