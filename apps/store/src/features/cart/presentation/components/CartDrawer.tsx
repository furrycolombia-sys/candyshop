"use client";

import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { i18nField, i18nPrice, tid } from "shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "ui";

import { useCart } from "@/features/cart/application/CartContext";
import { useFlyToCartContext } from "@/features/cart/application/FlyToCartContext";
import { getCategoryColor } from "@/shared/domain/categoryConstants";

const BADGE_OVERFLOW_THRESHOLD = 99;

export function CartDrawer() {
  const t = useTranslations("cart");
  const tTypes = useTranslations("productTypes");
  const locale = useLocale();
  const { items, total, itemCount, removeItem, updateQuantity, clearCart } =
    useCart();
  const flyCtx = useFlyToCartContext();

  // Merge SheetTrigger's forwarded ref with the fly-to-cart target ref
  const setCartTarget = flyCtx?.setCartTarget;
  const triggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setCartTarget?.(node);
    },
    [setCartTarget],
  );

  const badgeLabel =
    itemCount > BADGE_OVERFLOW_THRESHOLD
      ? t("itemCountBadge", { count: BADGE_OVERFLOW_THRESHOLD })
      : String(itemCount);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          ref={triggerRef}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 nb-btn nb-btn-press-sm nb-shadow-md bg-foreground text-background font-display text-xs font-extrabold uppercase tracking-widest px-5 py-3 hover:translate-0 transition-all"
          aria-label={t("title")}
          {...tid("cart-drawer-trigger")}
        >
          <ShoppingCart size={18} aria-hidden="true" />
          <span>{t("title")}</span>
          {itemCount > 0 && (
            <span
              className="flex min-w-6 size-6 items-center justify-center rounded-full bg-pink text-foreground font-sans text-xs leading-none font-bold px-1.5 -mr-1"
              aria-hidden="true"
            >
              {badgeLabel}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md border-l-3 border-foreground rounded-none p-0 bg-background"
        closeLabel={t("continueShopping")}
        data-testid="cart-drawer"
      >
        {/* Header */}
        <SheetHeader className="border-b-3 border-foreground px-5 py-4 flex flex-row items-center justify-between">
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
            <div className="size-20 border-3 border-foreground/20 flex items-center justify-center">
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
                const itemColor = getCategoryColor(item.category ?? "");
                const name = i18nField(item, "name", locale);
                const lineTotal = item.price_usd * item.quantity;
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 border-b-3 border-foreground/10 px-5 py-4 group"
                    {...tid("cart-item")}
                  >
                    {/* Product color thumbnail */}
                    <div
                      className={`size-20 shrink-0 border-3 border-foreground flex items-center justify-center ${itemColor}`}
                    >
                      <span className="font-display text-tiny font-extrabold uppercase tracking-widest text-foreground/30">
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
                          {name}
                        </p>
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
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
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
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
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
              })}
            </ul>

            {/* Footer */}
            <div className="border-t-3 border-foreground px-5 py-4 flex flex-col gap-3 bg-background">
              {/* Clear cart */}
              <div className="flex justify-end">
                <button
                  className="text-tiny font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={clearCart}
                  {...tid("cart-drawer-clear")}
                >
                  <Trash2 size={10} aria-hidden="true" />
                  {t("clear")}
                </button>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-3 border-foreground p-3">
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
                className="nb-btn nb-btn-press-lg nb-shadow-sm w-full justify-center font-display text-sm font-extrabold uppercase tracking-widest py-3 bg-pink opacity-50 cursor-not-allowed"
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
