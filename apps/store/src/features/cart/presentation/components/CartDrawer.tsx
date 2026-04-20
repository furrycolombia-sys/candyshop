"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { tid } from "shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "ui";

import { CartItemRow } from "./CartItemRow";

import { useCart } from "@/features/cart/application/CartContext";
import { useFlyToCartContext } from "@/features/cart/application/FlyToCartContext";
import { groupCartBySeller } from "@/features/cart/application/groupBySeller";
import { useSellerProfiles } from "@/features/cart/application/hooks/useSellerProfiles";
import { appUrls } from "@/shared/infrastructure/config";

const BADGE_OVERFLOW_THRESHOLD = 99;

export function CartDrawer() {
  const t = useTranslations("cart");
  const tProducts = useTranslations("products");
  const tTypes = useTranslations("productTypes");
  const tCategories = useTranslations("categories");
  const locale = useLocale();
  const { items, itemCount, removeItem, updateQuantity, clearCart } = useCart();
  const flyCtx = useFlyToCartContext();

  // Group items by seller
  const sellerGroups = useMemo(() => groupCartBySeller(items), [items]);
  const sellerIds = useMemo(
    () => sellerGroups.map((g) => g.sellerId),
    [sellerGroups],
  );
  const { data: sellerNames } = useSellerProfiles(sellerIds);

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

  /** Format a raw currency amount using the shared i18nPrice utility */
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          ref={triggerRef}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 button-brutal button-press-sm shadow-brutal-md bg-foreground text-background font-display text-xs font-extrabold uppercase tracking-widest px-5 py-3 hover:translate-0 transition-all"
          aria-label={t("title")}
          {...tid("cart-drawer-trigger")}
        >
          <ShoppingCart size={18} aria-hidden="true" />
          <span>{t("title")}</span>
          {itemCount > 0 && (
            <span
              className="flex min-w-6 size-6 items-center justify-center rounded-full bg-primary px-1.5 font-sans text-xs leading-none font-bold text-primary-foreground -mr-1"
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
        <SheetHeader className="border-b-strong border-foreground px-5 py-4 flex flex-row items-center justify-between">
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
            <div className="size-20 border-strong border-foreground/20 flex items-center justify-center">
              <ShoppingCart
                size={32}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <p className="font-display text-lg font-extrabold uppercase tracking-tight">
              {t("empty")}
            </p>
            <p className="max-w-empty-copy text-center text-sm text-muted-foreground">
              {t("emptyHint")}
            </p>
          </div>
        )}

        {/* Cart items grouped by seller */}
        {items.length > 0 && (
          <>
            <div
              className="flex flex-1 flex-col overflow-y-auto"
              {...tid("cart-drawer-items")}
            >
              {sellerGroups.map((group) => {
                const sellerName =
                  group.sellerId === "unknown"
                    ? t("unknownSeller")
                    : (sellerNames?.[group.sellerId] ?? t("unknownSeller"));

                return (
                  <div key={group.sellerId} {...tid("cart-seller-group")}>
                    {/* Seller header */}
                    <div className="border-b border-foreground/10 px-5 pt-4 pb-2">
                      <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {t("sellerGroup", { sellerName })}
                      </span>
                    </div>

                    {/* Seller items */}
                    <ul>
                      {group.items.map((item) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          locale={locale}
                          translators={{ t, tProducts, tTypes, tCategories }}
                          removeItem={removeItem}
                          updateQuantity={updateQuantity}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t-strong border-foreground bg-background px-5 py-4">
              {/* Clear cart */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-ui-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={clearCart}
                  {...tid("cart-drawer-clear")}
                >
                  <Trash2 size={10} aria-hidden="true" />
                  {t("clear")}
                </button>
              </div>

              {/* Checkout */}
              <a
                href={`${appUrls.payments}/${locale}/checkout`}
                className="button-brutal button-press-sm flex w-full items-center justify-center gap-2 border-strong border-foreground bg-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider text-background"
                {...tid("cart-checkout")}
              >
                {t("checkout")}
              </a>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
