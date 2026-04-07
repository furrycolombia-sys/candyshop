"use client";

import { useSupabaseAuth } from "auth/client";
import { useCurrentUserPermissions } from "auth/client";
import { ArrowLeft, PartyPopper, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tid } from "shared";
import { Skeleton } from "ui";

import { useCartFromCookie } from "@/features/checkout/application/hooks/useCartFromCookie";
import { useSubmitPayment } from "@/features/checkout/application/hooks/useSubmitPayment";
import type { CheckoutSellerStatus } from "@/features/checkout/domain/types";
import { clearCartCookie } from "@/features/checkout/infrastructure/cartCookie";
import { SellerCheckoutCard } from "@/features/checkout/presentation/components/SellerCheckoutCard";
import { appUrls } from "@/shared/infrastructure/config";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

function CheckoutPageContent() {
  const t = useTranslations("checkout");
  const { user } = useSupabaseAuth();
  const { groups, isEmpty, isLoading, getItemName } = useCartFromCookie();
  const submitPayment = useSubmitPayment();

  // Generate a unique checkout session ID for this checkout
  const checkoutSessionId = useRef(crypto.randomUUID()).current;

  // Per-seller status tracking
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
      subtotalCop: number,
      params: {
        paymentMethodId: string;
        transferNumber: string | null;
        receiptFile: File | null;
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
          totalCop: subtotalCop,
          checkoutSessionId,
          transferNumber: params.transferNumber,
          receiptFile: params.receiptFile,
        });

        updateSellerState(sellerId, "submitted", null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("errorOccurred");
        updateSellerState(sellerId, "error", message);
      }
    },
    [user, submitPayment, checkoutSessionId, updateSellerState, t],
  );

  const allSubmitted = useMemo(() => {
    if (groups.length === 0) return false;
    return groups.every(
      (g) => sellerStates[g.sellerId]?.status === "submitted",
    );
  }, [groups, sellerStates]);

  // Clear cart when all orders are submitted
  const cartCleared = useRef(false);
  useEffect(() => {
    if (allSubmitted && !cartCleared.current) {
      cartCleared.current = true;
      clearCartCookie();
    }
  }, [allSubmitted]);

  // Loading state
  if (isLoading) {
    return (
      <main className="flex flex-1 justify-center bg-dots p-4 pt-8">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  // Empty cart
  if (isEmpty) {
    return (
      <main
        className="flex flex-1 items-center justify-center bg-dots p-4"
        {...tid("checkout-empty")}
      >
        <div className="nb-shadow-lg w-full max-w-md border-3 border-foreground bg-background p-8 text-center sm:p-10">
          <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("emptyCart")}
          </h1>
          <a
            href={appUrls.store}
            className="nb-btn nb-btn-press-sm nb-shadow-sm mt-6 inline-flex items-center gap-2 border-3 border-foreground bg-foreground px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-background"
            {...tid("checkout-go-to-store")}
          >
            <ArrowLeft className="size-4" />
            {t("goToStore")}
          </a>
        </div>
      </main>
    );
  }

  // All submitted success state
  if (allSubmitted) {
    return (
      <main
        className="flex flex-1 items-center justify-center bg-dots p-4"
        {...tid("checkout-all-submitted")}
      >
        <div className="nb-shadow-lg w-full max-w-md border-3 border-foreground bg-background p-8 text-center sm:p-10">
          <PartyPopper className="mx-auto mb-4 size-12 text-success" />
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            {t("allSubmitted")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("pendingVerification")}
          </p>
          {/* Orders page link will be added in Part 3 (seller verification) */}
        </div>
      </main>
    );
  }

  // Main checkout flow
  return (
    <main
      className="flex flex-1 justify-center bg-dots p-4 pt-8"
      {...tid("checkout-page")}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1
            className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl"
            {...tid("checkout-title")}
          >
            {t("title")}
          </h1>
          <a
            href={appUrls.store}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            {...tid("checkout-back-to-store")}
          >
            <ArrowLeft className="size-3" />
            {t("backToStore")}
          </a>
        </div>

        {/* Seller cards */}
        {groups.map((group) => (
          <SellerCheckoutCard
            key={group.sellerId}
            sellerId={group.sellerId}
            sellerName={group.sellerName}
            items={group.items}
            subtotalCop={group.subtotalCop}
            status={sellerStates[group.sellerId]?.status ?? "pending"}
            error={sellerStates[group.sellerId]?.error ?? null}
            getItemName={getItemName}
            onSubmit={(params) =>
              handleSubmit(
                group.sellerId,
                group.items,
                group.subtotalCop,
                params,
              )
            }
          />
        ))}
      </div>
    </main>
  );
}

export function CheckoutPage() {
  const { isLoading, hasPermission } = useCurrentUserPermissions();

  if (isLoading) {
    return null;
  }

  if (!hasPermission(["orders.create", "receipts.create"])) {
    return <AccessDeniedState />;
  }

  return <CheckoutPageContent />;
}
