"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { tid } from "shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "ui";

import { CartItemRow } from "./CartItemRow";

import { useCart } from "@/features/cart/application/CartContext";
import { useFlyToCartContext } from "@/features/cart/application/FlyToCartContext";

const BADGE_OVERFLOW_THRESHOLD = 99;

export function CartDrawer() {
  const t = useTranslations("cart");
  const tProducts = useTranslations("products");
  const tTypes = useTranslations("productTypes");
  const tCategories = useTranslations("categories");
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
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  tProducts={tProducts}
                  tTypes={tTypes}
                  tCategories={tCategories}
                  t={t}
                  removeItem={removeItem}
                  updateQuantity={updateQuantity}
                />
              ))}
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
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    {locale === "en" ? "USD" : "COP"}
                  </span>
                  {locale === "en"
                    ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `$${total.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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
