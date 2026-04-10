# Checkout Stock Integrity

## Purpose

This document defines the stock and payment-data invariant for checkout.

The system must never let buyers complete or even prepare a payment flow for
quantities above current stock. A warning in the UI is not enough. The backend
must also withhold seller payment information when stock validation fails.

## Threat model

Two failure modes matter here:

1. Normal UI actions let a buyer increase quantity above `max_quantity`.
2. A stale or tampered cart reaches checkout with invalid quantities and the
   backend still returns seller payment details.

The second case is a security issue. Returning payment instructions for an
invalid checkout creates a false payment path and can produce payments for
orders the system should not accept.

## Required behavior

### Store cart

- Cart mutations must cap quantity at `max_quantity`.
- Add-to-cart buttons must stop allowing increments once the cap is reached.
- Quantity-increase controls inside the cart must also stop at the cap.
- Cookie hydration may still load stale or tampered quantities so checkout can
  detect and handle them explicitly.

### Checkout backend

- Checkout payment methods must be loaded through a server route.
- The server route must authenticate the buyer.
- The server route must verify checkout permissions.
- The server route must validate each requested item against current product
  state:
  - product exists
  - product belongs to the requested seller
  - product is active
  - requested quantity does not exceed `max_quantity`
- If any item fails validation, the response must return:
  - `hasStockIssues: true`
  - `methods: []`
- In that invalid-stock branch, the response must not contain:
  - account details
  - seller notes
  - any payment method metadata beyond the empty list

### Database policy

- Direct browser reads of `seller_payment_methods` must not be public.
- Only the owning seller may read their own payment methods through the
  management flow.
- Buyer checkout must rely on the validated server route instead of direct
  client-side table access.

## Current implementation

### Store

- Cart capping: [CartContext.tsx](/Z:/Github/candystore/apps/store/src/features/cart/application/CartContext.tsx)
- Add-to-cart limit handling: [useAddToCart.ts](/Z:/Github/candystore/apps/store/src/shared/application/hooks/useAddToCart.ts)
- Cart quantity controls: [CartItemRow.tsx](/Z:/Github/candystore/apps/store/src/features/cart/presentation/components/CartItemRow.tsx)

### Payments

- Validated checkout route: [route.ts](/Z:/Github/candystore/apps/payments/src/app/api/checkout/payment-methods/route.ts)
- Client hook using the route: [useSellerPaymentMethods.ts](/Z:/Github/candystore/apps/payments/src/features/checkout/application/hooks/useSellerPaymentMethods.ts)
- Checkout card behavior: [SellerCheckoutCard.tsx](/Z:/Github/candystore/apps/payments/src/features/checkout/presentation/components/SellerCheckoutCard.tsx)
- Checkout warning-only state: [SellerCheckoutContent.tsx](/Z:/Github/candystore/apps/payments/src/features/checkout/presentation/components/SellerCheckoutContent.tsx)

### Database

- RLS lock-down migration: [20260410120000_lock_checkout_payment_method_reads.sql](/Z:/Github/candystore/supabase/migrations/20260410120000_lock_checkout_payment_method_reads.sql)

## Verification

### Unit and route tests

- Store:
  - [CartContext.test.tsx](/Z:/Github/candystore/apps/store/src/features/cart/application/CartContext.test.tsx)
  - [useAddToCart.test.ts](/Z:/Github/candystore/apps/store/src/shared/application/hooks/useAddToCart.test.ts)
  - [CartItemRow.test.tsx](/Z:/Github/candystore/apps/store/src/features/cart/presentation/components/CartItemRow.test.tsx)
  - [ProductCard.test.tsx](/Z:/Github/candystore/apps/store/src/features/products/presentation/components/ProductCard.test.tsx)
  - [HeroSection.test.tsx](/Z:/Github/candystore/apps/store/src/features/products/presentation/components/product-detail/HeroSection.test.tsx)
- Payments:
  - [route.test.ts](/Z:/Github/candystore/apps/payments/src/app/api/checkout/payment-methods/route.test.ts)
  - [useSellerPaymentMethods.test.tsx](/Z:/Github/candystore/apps/payments/src/features/checkout/application/hooks/useSellerPaymentMethods.test.tsx)
  - [SellerCheckoutCard.test.tsx](/Z:/Github/candystore/apps/payments/src/features/checkout/presentation/components/SellerCheckoutCard.test.tsx)
  - [SellerCheckoutContent.test.tsx](/Z:/Github/candystore/apps/payments/src/features/checkout/presentation/components/SellerCheckoutContent.test.tsx)

Commands:

```bash
pnpm --filter store test -- CartContext.test.tsx useAddToCart.test.ts ProductCard.test.tsx HeroSection.test.tsx CartItemRow.test.tsx
pnpm --filter payments test -- route.test.ts useSellerPaymentMethods.test.tsx SellerCheckoutCard.test.tsx SellerCheckoutContent.test.tsx
pnpm --filter store typecheck
pnpm --filter payments typecheck
```

### Playwright

- Tampered/stale overstock checkout flow:
  - [checkout-stock-integrity.spec.ts](/Z:/Github/candystore/apps/auth/e2e/checkout-stock-integrity.spec.ts)

Command:

```bash
pnpm --filter auth-app exec playwright test e2e/checkout-stock-integrity.spec.ts --reporter=line
```

## Local rollout

When local Supabase is running, apply migrations with:

```bash
npx supabase migration up
```

Relevant local services:

- API: `http://127.0.0.1:54321`
- DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## Review checklist

- Can any store interaction exceed `max_quantity`?
- Does checkout ever return payment methods for invalid stock?
- Does the invalid-stock checkout state hide all payment instructions?
- Is `seller_payment_methods` still blocked from public buyer reads?
