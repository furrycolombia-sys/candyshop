# Checkout Flow — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Part:** 2 of 3 (Payment Methods ✅ → Checkout Flow → Seller Verification)

---

## Overview

Buyers check out from the store cart. The cart groups items by seller. Clicking "Checkout" redirects to the payments app where the buyer selects a payment method per seller, enters transfer details, uploads a receipt, and submits. Stock is reserved only when the buyer starts the payment process — first come, first served.

---

## Flow

```
STORE                           PAYMENTS APP
─────                           ────────────
Cart (grouped by seller)
  ↓ "Checkout" button
  ↓ redirect to /payments/en/checkout
                                Checkout page
                                  ├─ Seller A tab
                                  │   ├─ Items summary
                                  │   ├─ Select payment method
                                  │   ├─ See account details + seller note
                                  │   ├─ Enter transfer number
                                  │   ├─ Upload receipt
                                  │   └─ "Submit Payment" → creates order, reserves stock
                                  ├─ Seller B tab
                                  │   └─ (same flow, independent)
                                  └─ Seller C tab (can submit later)

                                Order tracking (/payments/en/orders)
                                  ├─ Status per order
                                  ├─ Re-upload receipt when evidence_requested
                                  └─ Expiration warnings
```

---

## Cart Changes (Store App)

### Grouping by Seller

The cart currently stores `CartItem[]` (product + quantity). Products have `seller_id`. The cart presentation layer groups items by `seller_id` and displays:

- **Seller name** — fetched from `user_profiles` by seller_id (display_name or email fallback)
- **Items under each seller** — with prices and quantities
- **Subtotal per seller**
- **Cart total** across all sellers

### Checkout Button

The existing disabled "Checkout" button becomes active. It navigates to:

```
{appUrls.payments}/{locale}/checkout
```

The cart data stays in the cookie — the payments app reads it.

### Seller Profile Fetching

The store needs to display seller names in the cart. Options:

- Fetch from `user_profiles` table using the `seller_id` values from cart items
- Join at query time when loading products (add `seller_id` to product select)

Products already include `seller_id`. The cart stores the full product object. We just need a query to fetch `user_profiles` for the unique seller IDs in the cart.

---

## Database Changes

### Extend `payment_status` Enum

```sql
-- Drop and recreate with full lifecycle
alter type public.payment_status rename to payment_status_old;

create type public.payment_status as enum (
  'pending',
  'awaiting_payment',
  'pending_verification',
  'evidence_requested',
  'approved',
  'rejected',
  'expired'
);

alter table public.orders
  alter column payment_status drop default,
  alter column payment_status type public.payment_status
    using payment_status::text::public.payment_status,
  alter column payment_status set default 'pending';

drop type public.payment_status_old;
```

### Extend `orders` Table

```sql
alter table public.orders
  add column seller_id uuid references auth.users(id),
  add column payment_method_id uuid references public.seller_payment_methods(id),
  add column transfer_number text,
  add column receipt_url text,
  add column seller_note text,
  add column expires_at timestamptz,
  add column checkout_session_id uuid;
```

- `seller_id` — which seller this order pays (one order per seller per checkout)
- `payment_method_id` — which of the seller's payment methods the buyer chose
- `transfer_number` — buyer's bank reference (cleared on rejection)
- `receipt_url` — Supabase Storage path to uploaded receipt (cleared on rejection)
- `seller_note` — seller's message on reject/evidence_requested
- `expires_at` — when the current lifecycle step times out
- `checkout_session_id` — groups orders from the same checkout session (UUID generated client-side)

### Indexes

```sql
create index orders_seller_id_idx on public.orders(seller_id);
create index orders_checkout_session_idx on public.orders(checkout_session_id);
create index orders_user_status_idx on public.orders(user_id, payment_status);
create index orders_expires_at_idx on public.orders(expires_at) where expires_at is not null;
```

### RLS Updates

```sql
-- Buyers can read their own orders
-- (existing policy: orders_own_read)

-- Sellers can read orders where they are the seller
create policy "orders_seller_read" on public.orders
  for select using (auth.uid() = seller_id);

-- Buyers can insert orders (checkout creates them)
create policy "orders_buyer_insert" on public.orders
  for insert with check (auth.uid() = user_id);

-- Buyers can update their own orders (submit receipt, re-upload)
create policy "orders_buyer_update" on public.orders
  for update using (auth.uid() = user_id);

-- Sellers can update orders they received (approve, reject, request evidence)
create policy "orders_seller_update" on public.orders
  for update using (auth.uid() = seller_id);
```

### Supabase Storage Bucket

```sql
-- Create bucket for receipt uploads
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

-- Buyers can upload receipts
create policy "receipts_buyer_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

-- Buyers and sellers can read receipts (both need to see them)
create policy "receipts_auth_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );

-- Buyers can delete their own receipts (on re-upload)
create policy "receipts_buyer_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
  );
```

---

## Stock Reservation Logic

### When buyer submits payment for a seller group:

1. **Check stock** — for each item, verify `max_quantity` is null (unlimited) or >= requested quantity
2. **Reserve stock** — decrement `max_quantity` for each product by the ordered quantity
3. **Create order** — insert order row with `awaiting_payment` or `pending_verification` status
4. **Create order items** — insert order_items rows
5. **Set expiration** — `expires_at = now() + timeout_hours`

If stock check fails for any item, reject the entire seller group with an error message.

### When order expires or is rejected:

1. **Release stock** — increment `max_quantity` for each product by the ordered quantity
2. **Clear receipt data** — set `transfer_number = null`, `receipt_url = null`
3. **Update status** — set to `expired` or `rejected`

### Race condition handling:

Use Postgres row-level locking:

```sql
-- Inside a transaction:
select max_quantity from products where id = $1 for update;
-- Check if sufficient
update products set max_quantity = max_quantity - $quantity where id = $1;
```

This is handled in a Supabase RPC function for atomicity.

---

## Payments App — Checkout Page

### Route

`/[locale]/checkout`

### Architecture

```
apps/payments/src/features/checkout/
├── domain/
│   ├── types.ts              # CheckoutOrder, SellerGroup, etc.
│   └── constants.ts          # Query keys
├── infrastructure/
│   ├── checkoutQueries.ts    # Create orders, fetch seller methods
│   ├── receiptStorage.ts     # Upload/delete receipts in Supabase Storage
│   └── stockReservation.ts   # RPC calls for atomic stock ops
├── application/
│   └── hooks/
│       ├── useCheckout.ts            # Main checkout orchestration
│       ├── useSellerPaymentMethods.ts # Fetch seller's methods for checkout
│       └── useReceiptUpload.ts       # Upload receipt to storage
├── presentation/
│   ├── pages/
│   │   └── CheckoutPage.tsx          # Main checkout page
│   └── components/
│       ├── SellerCheckoutCard.tsx     # Per-seller card with method selection + form
│       ├── PaymentMethodSelector.tsx  # Dropdown/radio to pick payment method
│       ├── ReceiptUpload.tsx          # File upload for receipt image
│       └── CheckoutSummary.tsx        # Items + total per seller
└── index.ts
```

### Page Layout

1. **Header** — "Checkout" title, back to store link
2. **Accordion/Cards** — one per seller, expandable
   - **Seller name + avatar** — from user_profiles
   - **Items summary** — product names, quantities, prices
   - **Subtotal**
   - **Payment method selector** — dropdown of seller's active payment methods
   - **Account details** — shown after selecting method (from seller_payment_methods)
   - **Seller note** — personal message from seller
   - **Transfer number input** — if method type requires it
   - **Receipt upload** — if method type requires it
   - **Submit button** — "Submit Payment" per seller
   - **Status indicator** — shows current state after submission (pending verification, etc.)

### Behavior

- Buyer can submit sellers in any order
- Each seller submission is independent
- Already-submitted sellers show their status (green check, pending spinner, etc.)
- If stock runs out between page load and submission, show error and remove items
- "Submit" is disabled until required fields are filled
- After all sellers are submitted (or skipped), show "Go to Orders" link
- Unsubmitted sellers warn about expiration: "Complete within X hours or items will be released"

---

## Payments App — Order Tracking

### Route

`/[locale]/orders`

### Architecture

```
apps/payments/src/features/orders/
├── domain/
│   └── types.ts              # Order with items, status helpers
├── infrastructure/
│   └── orderQueries.ts       # Fetch buyer's orders
├── application/
│   └── hooks/
│       ├── useMyOrders.ts    # Fetch buyer's orders
│       └── useResubmitReceipt.ts  # Re-upload for evidence_requested
├── presentation/
│   ├── pages/
│   │   └── OrdersPage.tsx    # Order list
│   └── components/
│       ├── OrderCard.tsx     # Single order with status, items, actions
│       └── OrderStatusBadge.tsx  # Color-coded status pill
└── index.ts
```

### Page Layout

1. **Header** — "My Orders" title
2. **Order cards** — grouped by `checkout_session_id` (orders from the same checkout shown together)
   - **Seller name**
   - **Status badge** — color-coded (awaiting_payment=yellow, pending_verification=blue, approved=green, rejected=red, expired=gray, evidence_requested=orange)
   - **Items** — product names + quantities
   - **Total**
   - **Expiration countdown** — if `expires_at` is set and status is active
   - **Actions:**
     - `awaiting_payment` → "Complete Payment" link back to checkout
     - `evidence_requested` → "Re-upload Receipt" form (transfer number + receipt)
     - `approved` → show receipt + confirmation
     - `rejected` → show seller's note, "items returned to cart" message
     - `expired` → "This order expired" message

---

## Payments App — Shared Cart Reading

The payments app needs to read the store's cart cookie. Create a shared utility:

```
apps/payments/src/shared/application/hooks/useCartFromCookie.ts
```

This reads the `candystore-cart` cookie (same format as the store's CartContext), parses it, and groups items by `seller_id`. It also fetches seller profiles for display names.

---

## i18n Keys

### Store (cart changes)

```
cart.sellerGroup — "{sellerName}'s items"
cart.checkout — "Checkout"
cart.subtotal — "Subtotal"
```

### Payments (checkout + orders)

```
checkout.title — "Checkout"
checkout.backToStore — "Back to Store"
checkout.selectPaymentMethod — "Select Payment Method"
checkout.accountDetails — "Account Details"
checkout.sellerNote — "Note from Seller"
checkout.transferNumber — "Transfer Number"
checkout.transferNumberHint — "Enter the bank reference number"
checkout.uploadReceipt — "Upload Receipt"
checkout.uploadReceiptHint — "Photo of your payment confirmation"
checkout.submit — "Submit Payment"
checkout.submitting — "Submitting..."
checkout.submitted — "Payment Submitted"
checkout.pendingVerification — "Waiting for seller verification"
checkout.outOfStock — "Some items are no longer available"
checkout.expirationWarning — "Complete within {hours} hours"
checkout.allSubmitted — "All payments submitted!"
checkout.goToOrders — "View My Orders"
checkout.itemsTotal — "{count} items"

orders.title — "My Orders"
orders.noOrders — "No orders yet"
orders.status.pending — "Pending"
orders.status.awaiting_payment — "Awaiting Payment"
orders.status.pending_verification — "Pending Verification"
orders.status.evidence_requested — "Evidence Requested"
orders.status.approved — "Approved"
orders.status.rejected — "Rejected"
orders.status.expired — "Expired"
orders.reupload — "Re-upload Receipt"
orders.sellerNote — "Seller's Message"
orders.expiresIn — "Expires in {time}"
orders.expired — "This order has expired"
orders.completePayment — "Complete Payment"
```

---

## Migration

Single migration: `20260326100000_checkout_orders.sql`

1. Extend `payment_status` enum
2. Add columns to `orders` table
3. New indexes
4. New/updated RLS policies
5. Create `receipts` storage bucket with policies
6. Create `reserve_stock` RPC function for atomic stock operations

---

## What This Does NOT Include

- Seller verification UI in Studio (Part 3)
- Automatic expiration jobs (cron/edge function — Part 3)
- Email/push notifications (future)
- Refund flow (future)
- Multiple currencies per order (prices are in COP for now)

---

## What Changes Where

| File/Area                                          | Change                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `supabase/migrations/`                             | New migration for order extensions + storage bucket          |
| `apps/store/src/features/cart/`                    | Group by seller, enable checkout button, seller name display |
| `apps/payments/src/features/checkout/`             | New feature: checkout flow                                   |
| `apps/payments/src/features/orders/`               | New feature: order tracking                                  |
| `apps/payments/src/app/[locale]/checkout/page.tsx` | New route                                                    |
| `apps/payments/src/app/[locale]/orders/page.tsx`   | New route                                                    |
| Store i18n (en/es)                                 | Cart seller grouping keys                                    |
| Payments i18n (en/es)                              | Checkout + orders keys                                       |
