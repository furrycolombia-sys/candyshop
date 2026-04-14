# Seller Payment Methods & Admin Payment Settings — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Part:** 1 of 3 (Payment Methods → Checkout Flow → Verification)

---

## Overview

Sellers configure custom payment methods (bank transfer, Nequi, PayPal, etc.) that buyers choose from at checkout. Admin configures global timeout settings for the payment lifecycle.

This is the **foundation** — checkout flow and seller verification depend on these existing first.

---

## Sub-Order Lifecycle (for context)

```
AWAITING_PAYMENT        → timeout expires → EXPIRED (stock released)
    ↓ buyer uploads receipt
PENDING_VERIFICATION    → timeout expires → EXPIRED (stock released)
    ↓ seller reviews
APPROVED                → stock permanently decremented
REJECTED                → stock released, buyer starts over from cart
EVIDENCE_REQUESTED      → timeout expires → EXPIRED (stock released)
    ↓ buyer re-uploads
PENDING_VERIFICATION    → (back to verification)
```

Each step has its own admin-configured timeout. Rejection or expiration releases stock immediately.

---

## Database Schema

### `public.seller_payment_methods`

| Column                     | Type        | Nullable | Default             | Notes                                          |
| -------------------------- | ----------- | -------- | ------------------- | ---------------------------------------------- |
| `id`                       | uuid        | NO       | `gen_random_uuid()` | PK                                             |
| `seller_id`                | uuid        | NO       | —                   | FK → auth.users(id)                            |
| `name_en`                  | text        | NO       | —                   | Display name (e.g., "Bancolombia Transfer")    |
| `name_es`                  | text        | NO       | —                   | Spanish name                                   |
| `instructions_en`          | text        | YES      | NULL                | How to pay (account number, email, etc.)       |
| `instructions_es`          | text        | YES      | NULL                | Spanish instructions                           |
| `icon`                     | text        | YES      | NULL                | Lucide icon name or image URL                  |
| `requires_receipt`         | boolean     | NO       | true                | Buyer must upload proof                        |
| `requires_transfer_number` | boolean     | NO       | true                | Buyer must enter reference                     |
| `currency`                 | text        | YES      | NULL                | NULL = any currency, or "COP", "USD"           |
| `min_amount`               | integer     | YES      | NULL                | Minimum order amount (in currency minor units) |
| `max_amount`               | integer     | YES      | NULL                | Maximum order amount                           |
| `is_active`                | boolean     | NO       | true                | Seller can disable without deleting            |
| `sort_order`               | integer     | NO       | 0                   | Display order                                  |
| `created_at`               | timestamptz | NO       | `now()`             |                                                |
| `updated_at`               | timestamptz | NO       | `now()`             |                                                |

### `public.payment_settings`

Global platform settings managed by admin. Key-value store for flexibility.

| Column       | Type        | Nullable | Default | Notes                         |
| ------------ | ----------- | -------- | ------- | ----------------------------- |
| `key`        | text        | NO       | —       | PK, setting name              |
| `value`      | text        | NO       | —       | Setting value (parsed by app) |
| `updated_at` | timestamptz | NO       | `now()` |                               |

**Initial settings:**

| Key                                  | Default Value | Description                           |
| ------------------------------------ | ------------- | ------------------------------------- |
| `timeout_awaiting_payment_hours`     | `48`          | Hours before unpaid sub-order expires |
| `timeout_pending_verification_hours` | `72`          | Hours seller has to verify receipt    |
| `timeout_evidence_requested_hours`   | `24`          | Hours buyer has to re-upload evidence |

### RLS Policies

**seller_payment_methods:**

- SELECT: public (buyers need to see them at checkout)
- INSERT: `auth.uid() = seller_id`
- UPDATE: `auth.uid() = seller_id`
- DELETE: `auth.uid() = seller_id`

**payment_settings:**

- SELECT: public (all apps need to read timeouts)
- INSERT/UPDATE/DELETE: authenticated only (admin enforced at app level for now)

### Indexes

- `seller_payment_methods_seller_id_idx` on `(seller_id, sort_order)`

### Audit

Both tables tracked via `audit.enable_tracking()`.

---

## Studio App — Seller Payment Methods

### Location

`apps/studio/src/features/payment-methods/`

### Architecture

```
features/payment-methods/
├── domain/
│   ├── types.ts              # SellerPaymentMethod interface
│   └── constants.ts          # Query key, form defaults
├── infrastructure/
│   └── paymentMethodQueries.ts  # Supabase CRUD
├── application/
│   └── hooks/
│       ├── usePaymentMethods.ts      # Fetch seller's methods
│       └── usePaymentMethodMutations.ts  # CUD mutations
├── presentation/
│   ├── pages/
│   │   └── PaymentMethodsPage.tsx    # Main page
│   └── components/
│       ├── PaymentMethodTable.tsx     # List table
│       └── PaymentMethodEditor.tsx   # Create/edit form
└── index.ts
```

### Route

`/[locale]/payment-methods` — new route in studio app

### Sidebar

New item "Payment Methods" in studio sidebar (after Products).

### Page Layout

Same pattern as admin templates:

1. **Header** — "Payment Methods" title + "Add Method" button
2. **Table** — rows: name, currency, receipt required?, active toggle, edit/delete
3. **Editor** — opens when creating or editing. Fields: name (EN/ES), instructions (EN/ES), icon, requires_receipt, requires_transfer_number, currency, min/max amount, active

### Key Behaviors

- Sellers only see/manage their OWN payment methods (RLS enforced)
- At least one active payment method required to sell (validated at checkout, not at method creation)
- Instructions field supports markdown-like formatting for account details
- Currency restriction: NULL means "any currency", otherwise limits to specific currency

---

## Admin App — Payment Settings

### Location

`apps/admin/src/features/settings/`

### Architecture

```
features/settings/
├── domain/
│   ├── types.ts              # PaymentSettings interface
│   └── constants.ts          # Query key, setting keys
├── infrastructure/
│   └── settingsQueries.ts    # Supabase read/write
├── application/
│   └── hooks/
│       ├── usePaymentSettings.ts     # Fetch settings
│       └── useUpdateSettings.ts      # Update mutations
├── presentation/
│   ├── pages/
│   │   └── SettingsPage.tsx          # Settings page
│   └── components/
│       └── TimeoutSettings.tsx       # Timeout configuration form
└── index.ts
```

### Route

`/[locale]/settings` — new route in admin app

### Sidebar

New item "Settings" under a new "Configuration" section in admin sidebar.

### Page Layout

Card-based form:

1. **Payment Timeouts** card
   - Awaiting Payment timeout (hours input)
   - Pending Verification timeout (hours input)
   - Evidence Requested timeout (hours input)
   - Save button

Future settings cards can be added below.

---

## i18n Keys

### Studio (payment methods)

```
sidebar.paymentMethods — "Payment Methods" / "Metodos de Pago"
paymentMethods.title — "Payment Methods"
paymentMethods.subtitle — "Configure how buyers can pay you"
paymentMethods.addMethod — "Add Method"
paymentMethods.name — "Method Name"
paymentMethods.instructions — "Payment Instructions"
paymentMethods.icon — "Icon"
paymentMethods.requiresReceipt — "Requires Receipt Upload"
paymentMethods.requiresTransferNumber — "Requires Transfer Number"
paymentMethods.currency — "Currency"
paymentMethods.anyCurrency — "Any Currency"
paymentMethods.minAmount — "Minimum Amount"
paymentMethods.maxAmount — "Maximum Amount"
paymentMethods.active — "Active"
paymentMethods.noMethods — "No payment methods yet"
paymentMethods.save — "Save"
paymentMethods.saving — "Saving..."
paymentMethods.cancel — "Cancel"
paymentMethods.deleteConfirm — "Delete this payment method?"
paymentMethods.editMethod — "Edit Method"
```

### Admin (settings)

```
sidebar.settings — "Settings"
sidebar.configuration — "Configuration"
settings.title — "Platform Settings"
settings.subtitle — "Global configuration for the platform"
settings.timeouts.title — "Payment Timeouts"
settings.timeouts.awaitingPayment — "Awaiting Payment"
settings.timeouts.awaitingPaymentHint — "Hours before unpaid order expires"
settings.timeouts.pendingVerification — "Pending Verification"
settings.timeouts.pendingVerificationHint — "Hours seller has to verify receipt"
settings.timeouts.evidenceRequested — "Evidence Requested"
settings.timeouts.evidenceRequestedHint — "Hours buyer has to re-upload evidence"
settings.timeouts.hours — "hours"
settings.save — "Save Settings"
settings.saving — "Saving..."
settings.saved — "Settings updated"
```

---

## Migration

Single migration: `20260326000000_payment_methods.sql`

1. Create `seller_payment_methods` table
2. Create `payment_settings` table
3. RLS policies for both
4. Indexes
5. Audit tracking
6. Seed default payment settings (3 timeout values)

---

## What This Does NOT Include

- Checkout flow (Part 2)
- Sub-order creation, stock reservation (Part 2)
- Seller verification UI (Part 3)
- Buyer order history (Part 3)
- Receipt upload/storage (Part 2)
- Payment status notifications (Part 3)

---

## What Changes Where

| File/Area                                               | Change                                        |
| ------------------------------------------------------- | --------------------------------------------- |
| `supabase/migrations/`                                  | New migration for both tables                 |
| `apps/studio/src/features/payment-methods/`             | New feature: payment method CRUD              |
| `apps/studio/src/app/[locale]/payment-methods/page.tsx` | New route                                     |
| Studio sidebar                                          | Add "Payment Methods" nav item                |
| Studio i18n (en/es)                                     | Payment method keys                           |
| `apps/admin/src/features/settings/`                     | New feature: timeout settings                 |
| `apps/admin/src/app/[locale]/settings/page.tsx`         | New route                                     |
| Admin sidebar                                           | Add "Settings" nav item under "Configuration" |
| Admin i18n (en/es)                                      | Settings keys                                 |
