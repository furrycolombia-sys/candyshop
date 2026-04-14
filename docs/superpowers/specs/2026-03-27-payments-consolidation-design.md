# Payments Consolidation Design

## Goal

Consolidate all seller/buyer payment workflows into the payments app. Move seller payment method configuration from studio to payments, and add sidebar navigation so all payment sections are discoverable.

## Architecture

### What moves

The `payment-methods` feature moves from studio to payments:

```
FROM: apps/studio/src/features/payment-methods/
  TO: apps/payments/src/features/payment-methods/
```

This includes the full Clean Architecture stack:

- `domain/` — types, constants
- `application/hooks/` — usePaymentMethods, usePaymentMethodMutations
- `infrastructure/` — paymentMethodQueries (Supabase CRUD)
- `presentation/components/` — PaymentMethodEditor, PaymentMethodTable
- `presentation/pages/` — PaymentMethodsPage

### What stays

- **Admin** keeps payment type catalog management (`payment-method-types` feature) and timeout settings (`settings` feature). These are platform-wide configuration, not seller workflows.
- **Store** keeps cart management. Checkout navigation to payments app stays the same.
- **Studio** loses all payment-related code. It becomes purely products + orders badge.

### No database changes

Same Supabase tables (`seller_payment_methods`, `payment_method_types`), same RLS policies. The queries use the authenticated user's ID, so they work regardless of which app calls them.

## Sidebar Navigation

The payments app gets a sidebar with role-based sections, matching admin's sidebar pattern.

### Structure

```
BUYER
  ├── Checkout          /[locale]/checkout
  └── My Orders         /[locale]/orders

SELLER
  ├── Payment Methods   /[locale]/payment-methods    (new route)
  └── Received Orders   /[locale]/orders/received
```

### Component

`apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx`

- Defined as a constant array of nav items with label (i18n key), href, icon (lucide-react)
- Two groups: "buyer" and "seller" with translated group headers
- Active state via `aria-current="page"` matching current pathname
- Responsive: full sidebar on desktop (lg+), collapsible on mobile via sheet/drawer
- Neobrutalism styling consistent with admin sidebar (border-3, font-display, uppercase labels)

### Navigation Items

| Group  | Label Key            | Path                        | Icon             |
| ------ | -------------------- | --------------------------- | ---------------- |
| Buyer  | `nav.checkout`       | `/[locale]/checkout`        | `ShoppingCart`   |
| Buyer  | `nav.myOrders`       | `/[locale]/orders`          | `Package`        |
| Seller | `nav.paymentMethods` | `/[locale]/payment-methods` | `CreditCard`     |
| Seller | `nav.receivedOrders` | `/[locale]/orders/received` | `ClipboardCheck` |

## Layout Changes

### Before (current)

```
┌─────────────────────────────────────┐
│  AppNavigation (top bar)            │
├─────────────────────────────────────┤
│         Centered Content            │
│         (max-w-7xl, px-6)           │
└─────────────────────────────────────┘
```

### After

```
┌─────────────────────────────────────┐
│  AppNavigation (top bar)            │
├──────────┬──────────────────────────┤
│ Sidebar  │  Page Content            │
│ (w-64)   │  (flex-1, overflow-auto) │
│          │                          │
│ BUYER    │                          │
│  Checkout│                          │
│  Orders  │                          │
│          │                          │
│ SELLER   │                          │
│  Methods │                          │
│  Received│                          │
└──────────┴──────────────────────────┘
```

File: `apps/payments/src/app/[locale]/layout.tsx`

The layout wraps page content in a flex row with the sidebar on the left. On mobile (below `lg`), the sidebar collapses into a hamburger-triggered sheet.

## Route Changes

### New route

```
apps/payments/src/app/[locale]/payment-methods/page.tsx
```

Thin wrapper importing `PaymentMethodsPage` from the feature.

### Deleted route

```
apps/studio/src/app/[locale]/payment-methods/page.tsx
```

### Existing routes (unchanged)

- `apps/payments/src/app/[locale]/checkout/page.tsx`
- `apps/payments/src/app/[locale]/orders/page.tsx`
- `apps/payments/src/app/[locale]/orders/received/page.tsx`

## Studio Cleanup

After moving payment-methods out:

1. Delete `apps/studio/src/features/payment-methods/` (entire folder)
2. Delete `apps/studio/src/app/[locale]/payment-methods/` (route)
3. Remove `paymentMethods.*` i18n keys from studio's `en.json` and `es.json`
4. Remove any imports referencing the deleted feature

Studio's navigation and layout remain unchanged — it just has one fewer page.

## i18n Changes

### Payments app — add keys

Add to `apps/payments/src/shared/infrastructure/i18n/messages/en.json` and `es.json`:

- `nav.checkout`, `nav.myOrders`, `nav.paymentMethods`, `nav.receivedOrders`
- `nav.buyerGroup`, `nav.sellerGroup` (section headers)
- All `paymentMethods.*` keys (copied from studio's locale files)

### Studio app — remove keys

Remove `paymentMethods.*` namespace from studio's locale files.

## PaymentMethodsPage Adjustments

The page moves mostly as-is, with minor changes:

- Remove the "Back to Products" link (was studio-specific navigation)
- The page title, editor, and table remain identical
- Supabase queries are unchanged (they use `createBrowserSupabaseClient()` which works in any app)

## Testing

### Moved tests

All `apps/studio/src/features/payment-methods/**/*.test.*` files move to `apps/payments/src/features/payment-methods/`. Import paths update from `@/features/payment-methods/...` (same alias, different app).

### New tests

- `PaymentsSidebar.test.tsx` — renders nav items, highlights active page, responsive behavior
- Verify payment-methods feature tests pass in their new location

### Coverage

Maintain 85%+ coverage across both payments and studio after the change.

## Files Changed Summary

### New files

- `apps/payments/src/shared/presentation/components/PaymentsSidebar.tsx`
- `apps/payments/src/app/[locale]/payment-methods/page.tsx`
- Payment-methods feature files (moved from studio)
- Payment-methods test files (moved from studio)

### Modified files

- `apps/payments/src/app/[locale]/layout.tsx` — add sidebar to layout
- `apps/payments/src/shared/infrastructure/i18n/messages/en.json` — add nav + paymentMethods keys
- `apps/payments/src/shared/infrastructure/i18n/messages/es.json` — add nav + paymentMethods keys

### Deleted files

- `apps/studio/src/features/payment-methods/` (entire tree)
- `apps/studio/src/app/[locale]/payment-methods/page.tsx`

### Modified (cleanup)

- `apps/studio/src/shared/infrastructure/i18n/messages/en.json` — remove paymentMethods keys
- `apps/studio/src/shared/infrastructure/i18n/messages/es.json` — remove paymentMethods keys
- `apps/studio/vitest.config.ts` — remove payment-methods coverage exclusions
