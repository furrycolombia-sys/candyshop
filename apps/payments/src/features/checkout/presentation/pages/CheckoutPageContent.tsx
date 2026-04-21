"use client";

import { useSupabaseAuth } from "auth/client";
import { ArrowLeft, PartyPopper, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useCartFromCookie } from "@/features/checkout/application/hooks/useCartFromCookie";
import { useClearCartCookie } from "@/features/checkout/application/hooks/useClearCartCookie";
import { useSubmitPayment } from "@/features/checkout/application/hooks/useSubmitPayment";
import {
  CHECKOUT_COMPLETED_SESSION_KEY,
  CHECKOUT_COMPLETED_VALUE,
} from "@/features/checkout/domain/constants";
import type { CheckoutSellerStatus } from "@/features/checkout/domain/types";
import { SellerCheckoutCard } from "@/features/checkout/presentation/components/SellerCheckoutCard";
import { appUrls } from "@/shared/infrastructure/config";

function readCompletedCheckoutFlag(): boolean {
  if (globalThis.window === undefined) return false;
  return (
    globalThis.sessionStorage.getItem(CHECKOUT_COMPLETED_SESSION_KEY) ===
    CHECKOUT_COMPLETED_VALUE
  );
}

function writeCompletedCheckoutFlag(value: boolean) {
  if (globalThis.window === undefined) return;

  if (value) {
    globalThis.sessionStorage.setItem(
      CHECKOUT_COMPLETED_SESSION_KEY,
      CHECKOUT_COMPLETED_VALUE,
    );
    return;
  }

  globalThis.sessionStorage.removeItem(CHECKOUT_COMPLETED_SESSION_KEY);
}

function getCompletedCheckoutState(allSubmitted: boolean): boolean {
  return allSubmitted || readCompletedCheckoutFlag();
}

export function CheckoutPageContent() {
  const t = useTranslations("checkout");
  const { user } = useSupabaseAuth();
  const { groups, isEmpty, isLoading, getItemName } = useCartFromCookie();
  const submitPayment = useSubmitPayment();
  const clearCartCookie = useClearCartCookie();
  const checkoutSessionId = useRef(crypto.randomUUID()).current;

  const [sellerStates, setSellerStates] = useState<
    Record<string, { status: CheckoutSellerStatus; error: string | null }>
  >({});
  const updateSellerState = useCallback(
    (sellerId: string, status: CheckoutSellerStatus, error: string | null) => {
      setSellerStates((prev) => ({
        ...prev,
        [sellerId]: { status, error },
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (
      sellerId: string,
      items: (typeof groups)[number]["items"],
      params: {
        paymentMethodId: string;
        buyerSubmission: Record<string, string>;
        receiptFile: File | null;
        transferNumber: string | null;
      },
    ) => {
      if (!user) return;

      updateSellerState(sellerId, "submitting", null);

      try {
        await submitPayment.mutateAsync({
          userId: user.id,
          sellerId,
          paymentMethodId: params.paymentMethodId,
          items,
          checkoutSessionId,
          buyerInfo: params.buyerSubmission,
          receiptFile: params.receiptFile,
          transferNumber: params.transferNumber,
        });

        updateSellerState(sellerId, "submitted", null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : ((error as { message?: string })?.message ?? t("errorOccurred"));
        updateSellerState(sellerId, "error", message);
      }
    },
    [user, submitPayment, checkoutSessionId, updateSellerState, t],
  );

  const allSubmitted = useMemo(() => {
    if (groups.length === 0) return false;
    return groups.every(
      (group) => sellerStates[group.sellerId]?.status === "submitted",
    );
  }, [groups, sellerStates]);
  const hasCompletedCheckout = getCompletedCheckoutState(allSubmitted);

  const cartCleared = useRef(false);
  useEffect(() => {
    if (allSubmitted && !cartCleared.current) {
      cartCleared.current = true;
      writeCompletedCheckoutFlag(true);
      clearCartCookie();
    }
  }, [allSubmitted, clearCartCookie]);

  useEffect(() => {
    if (groups.length > 0 && hasCompletedCheckout && !cartCleared.current) {
      writeCompletedCheckoutFlag(false);
    }
  }, [groups.length, hasCompletedCheckout]);

  if (isLoading) {
    return (
      <main className="flex flex-1 justify-center surface-grid-dots p-4 pt-8">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (hasCompletedCheckout || allSubmitted) {
    return (
      <main
        className="flex flex-1 items-center justify-center surface-grid-dots p-4"
        {...tid("checkout-all-submitted")}
      >
        <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 text-center sm:p-10">
          <PartyPopper className="mx-auto mb-4 size-12 text-success" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("allSubmitted")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("pendingVerification")}
          </p>
        </div>
      </main>
    );
  }

  if (isEmpty) {
    return (
      <main
        className="flex flex-1 items-center justify-center surface-grid-dots p-4"
        {...tid("checkout-empty")}
      >
        <div className="shadow-brutal-lg w-full max-w-md border-strong border-foreground bg-background p-8 text-center sm:p-10">
          <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("emptyCart")}
          </h1>
          <a
            href={appUrls.store}
            className="button-brutal button-press-sm shadow-brutal-sm mt-6 inline-flex items-center gap-2 border-strong border-foreground bg-foreground px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-background"
            {...tid("checkout-go-to-store")}
          >
            <ArrowLeft className="size-4" />
            {t("goToStore")}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 justify-center surface-grid-dots p-3 pt-4 sm:p-4 sm:pt-8"
      {...tid("checkout-page")}
    >
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1
            className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl"
            {...tid("checkout-title")}
          >
            {t("title")}
          </h1>
          <a
            href={appUrls.store}
            className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            {...tid("checkout-back-to-store")}
          >
            <ArrowLeft className="size-3" />
            {t("backToStore")}
          </a>
        </div>

        {groups.map((group) => (
          <SellerCheckoutCard
            key={group.sellerId}
            sellerId={group.sellerId}
            sellerName={group.sellerName}
            items={group.items}
            subtotal={group.subtotal}
            currency={group.currency}
            status={sellerStates[group.sellerId]?.status ?? "pending"}
            error={sellerStates[group.sellerId]?.error ?? null}
            getItemName={getItemName}
            onSubmit={(params) =>
              handleSubmit(group.sellerId, group.items, params)
            }
          />
        ))}
      </div>
    </main>
  );
}
