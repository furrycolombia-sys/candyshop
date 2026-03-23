"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "ui";

import { useCart } from "@/features/cart";
import { PRODUCT_CATEGORIES } from "@/features/products/domain/constants";

const BADGE_OVERFLOW_THRESHOLD = 99;

function getItemColor(type: string): string {
  // Map product types to candy colors for the thumbnail
  const typeColorMap: Record<string, string> = {
    physical: PRODUCT_CATEGORIES[0]?.color ?? "bg-(--pink)",
    digital: PRODUCT_CATEGORIES[4]?.color ?? "bg-(--sky)",
    commission: PRODUCT_CATEGORIES[2]?.color ?? "bg-(--lilac)",
    ticket: PRODUCT_CATEGORIES[3]?.color ?? "bg-(--lemon)",
  };
  return typeColorMap[type] ?? "bg-(--mint)";
}

export function CartDrawer() {
  const t = useTranslations("cart");
  const tTypes = useTranslations("productTypes");
  const { items, total, itemCount, removeItem, updateQuantity, clearCart } =
    useCart();

  const badgeLabel =
    itemCount > BADGE_OVERFLOW_THRESHOLD
      ? t("itemCountBadge", { count: BADGE_OVERFLOW_THRESHOLD })
      : String(itemCount);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="relative flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors"
          aria-label={t("title")}
          {...tid("cart-drawer-trigger")}
        >
          <ShoppingCart size={16} aria-hidden="true" />
          <span>{t("title")}</span>
          {itemCount > 0 && (
            <span
              className="flex size-5 items-center justify-center bg-foreground text-background text-[10px] font-extrabold border-2 border-background"
              aria-hidden="true"
            >
              {badgeLabel}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md border-l-[3px] border-foreground rounded-none p-0 bg-background"
        closeLabel={t("continueShopping")}
        data-testid="cart-drawer"
      >
        {/* Header */}
        <SheetHeader className="border-b-[3px] border-foreground px-5 py-4 flex flex-row items-center justify-between">
          <SheetTitle className="font-display text-xl font-extrabold uppercase tracking-tight">
            {t("title")}
            {itemCount > 0 && (
              <span className="ml-2 text-sm text-muted-foreground font-sans font-normal normal-case tracking-normal">
                ({t("itemCount", { count: itemCount })})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Empty state */}
        {items.length === 0 && (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 py-20 px-6"
            {...tid("cart-drawer-empty")}
          >
            <div className="size-20 border-[3px] border-foreground/20 flex items-center justify-center">
              <ShoppingCart
                size={32}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <p className="font-display text-lg font-extrabold uppercase tracking-tight">
              {t("empty")}
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-[240px]">
              {t("emptyHint")}
            </p>
          </div>
        )}

        {/* Cart items */}
        {items.length > 0 && (
          <>
            <ul
              className="flex flex-1 flex-col overflow-y-auto"
              {...tid("cart-drawer-items")}
            >
              {items.map((item) => {
                const itemColor = getItemColor(item.type);
                const lineTotal = item.price * item.quantity;
                return (
                  <li
                    key={item.productId}
                    className="flex gap-3 border-b-[3px] border-foreground/10 px-5 py-4 group"
                    {...tid("cart-item")}
                  >
                    {/* Product color thumbnail */}
                    <div
                      className={`size-20 shrink-0 border-[3px] border-foreground flex items-center justify-center ${itemColor}`}
                    >
                      <span className="font-display text-[10px] font-extrabold uppercase tracking-widest text-foreground/30">
                        {tTypes(item.type)}
                      </span>
                    </div>

                    {/* Item details */}
                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="font-display text-sm/tight font-bold"
                          {...tid("cart-item-name")}
                        >
                          {item.name}
                        </p>
                        <button
                          className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                          onClick={() => removeItem(item.productId)}
                          aria-label={t("removeItem", { name: item.name })}
                          {...tid("cart-item-remove")}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Quantity controls */}
                        <div
                          className="flex items-center border-[3px] border-foreground"
                          {...tid("cart-item-qty")}
                        >
                          <button
                            className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            aria-label={t("decreaseQty", { name: item.name })}
                            {...tid("cart-item-qty-decrease")}
                          >
                            <Minus size={12} aria-hidden="true" />
                          </button>
                          <span className="flex size-7 items-center justify-center border-x-[3px] border-foreground text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            className="flex size-7 items-center justify-center hover:bg-foreground hover:text-background transition-colors"
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            aria-label={t("increaseQty", { name: item.name })}
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
                          ${lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="border-t-[3px] border-foreground px-5 py-4 flex flex-col gap-3 bg-background">
              {/* Clear cart */}
              <div className="flex justify-end">
                <button
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={clearCart}
                  {...tid("cart-drawer-clear")}
                >
                  <Trash2 size={10} aria-hidden="true" />
                  {t("clear")}
                </button>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-[3px] border-foreground p-3">
                <span className="font-display text-sm font-extrabold uppercase tracking-tight">
                  {t("total")}
                </span>
                <span
                  className="font-display text-2xl font-extrabold"
                  {...tid("cart-drawer-total")}
                >
                  $
                  {total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Checkout */}
              <button
                className="nb-btn nb-btn-press-lg nb-shadow-sm w-full justify-center font-display text-sm font-extrabold uppercase tracking-widest py-3 bg-(--pink) opacity-50 cursor-not-allowed"
                disabled
                title={t("checkoutComingSoon")}
                {...tid("cart-drawer-checkout")}
              >
                {t("checkout")}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
