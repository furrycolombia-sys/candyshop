# Seller Verification & Buyer Order Tracking — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Part:** 3 of 3 (Payment Methods ✅ → Checkout Flow ✅ → Seller Verification)

---

## Overview

Both seller verification and buyer order tracking live in the payments app. Sellers approve/reject/request evidence for received orders. Buyers track their orders and re-upload receipts when requested. Studio shows a notification badge linking sellers to pending verifications.

---

## Routes (Payments App)

| Route                          | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `/payments/en/checkout`        | Buyer checkout (already built)                     |
| `/payments/en/orders`          | Buyer's purchases — status, re-upload              |
| `/payments/en/orders/received` | Seller's received orders — verify, approve, reject |

---

## Buyer Order Tracking (`/orders`)

### Page Layout

1. **Header** — "My Orders" title
2. **Order cards** — grouped by `checkout_session_id` (orders from same checkout together)
   - **Checkout group header** — date, number of sellers
   - **Per-seller order card:**
     - Seller name + avatar
     - Status badge (color-coded)
     - Items list (product names, quantities, prices)
     - Total
     - Expiration countdown (if active timer)
     - **Actions by status:**
       - `awaiting_payment` → "Complete Payment" link to checkout
       - `pending_verification` → "Waiting for seller" message
       - `evidence_requested` → seller's note + re-upload form (transfer number + receipt)
       - `approved` → green confirmation
       - `rejected` → seller's note, "Order cancelled" message
       - `expired` → "This order expired" message

### Re-upload Flow

When status is `evidence_requested`:

1. Show seller's note (why they need new evidence)
2. Transfer number input (pre-filled if exists)
3. Receipt upload (new file)
4. Submit button → updates order, status back to `pending_verification`, timer reset

---

## Seller Verification (`/orders/received`)

### Page Layout

1. **Header** — "Received Orders" title
2. **Filter tabs** — All | Pending Verification | Evidence Requested | Approved | Rejected
3. **Order cards** — one per order where `seller_id` = current user
   - Buyer name (from user_profiles)
   - Status badge
   - Items list
   - Total
   - **Receipt display** — transfer number + receipt image (clickable to enlarge)
   - **Expiration countdown** (verification timeout)
   - **Action buttons by status:**
     - `pending_verification` → "Approve" (green) + "Reject" (red) + "Request Evidence" (orange)
     - `evidence_requested` → waiting message + "Approve" + "Reject"
     - `approved` → completed, no actions
     - `rejected` → completed, no actions

### Seller Actions

**Approve:**

- Status → `approved`
- Stock stays decremented (permanent)
- No note required

**Reject:**

- Status → `rejected`
- Stock released (call `release_stock` RPC per item)
- Receipt + transfer number cleared
- **Requires note** — seller must explain why (shown to buyer)

**Request Evidence:**

- Status → `evidence_requested`
- Timer reset to `timeout_evidence_requested_hours`
- **Requires note** — seller explains what's wrong (shown to buyer)
- Receipt + transfer number NOT cleared (buyer sees old data + uploads new)

---

## Studio Notification Badge

### Location

Studio app sidebar or top nav area — a small badge showing the count of orders needing seller action (`pending_verification` + `evidence_requested`).

### Implementation

Since studio has no sidebar, add a notification indicator near the nav or as a floating element:

- A link/button in the studio's product list page header: "X pending orders" badge
- Links to `{appUrls.payments}/{locale}/orders/received`
- Fetches count from orders where `seller_id = auth.uid()` and status in (`pending_verification`, `evidence_requested`)

---

## Database Changes

### New RPC: Update order status with validation

```sql
create or replace function public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_seller_note text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  -- Validate state transitions
  case p_new_status
    when 'approved' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot approve from status %', v_order.payment_status;
      end if;
    when 'rejected' then
      if v_order.payment_status not in ('pending_verification', 'evidence_requested') then
        raise exception 'Cannot reject from status %', v_order.payment_status;
      end if;
      -- Release stock for each item
      perform public.release_stock(oi.product_id, oi.quantity)
      from public.order_items oi where oi.order_id = p_order_id;
      -- Clear receipt data
      update public.orders set transfer_number = null, receipt_url = null where id = p_order_id;
    when 'evidence_requested' then
      if v_order.payment_status not in ('pending_verification') then
        raise exception 'Cannot request evidence from status %', v_order.payment_status;
      end if;
      -- Reset timer
      select value::integer into v_timeout_hours
      from public.payment_settings where key = 'timeout_evidence_requested_hours';
      update public.orders set expires_at = now() + (coalesce(v_timeout_hours, 24) || ' hours')::interval where id = p_order_id;
    else
      raise exception 'Invalid status: %', p_new_status;
  end case;

  -- Update status and seller note
  update public.orders
  set payment_status = p_new_status::payment_status,
      seller_note = coalesce(p_seller_note, seller_note)
  where id = p_order_id;
end;
$$;
```

### New RPC: Resubmit evidence (buyer)

```sql
create or replace function public.resubmit_evidence(
  p_order_id uuid,
  p_transfer_number text,
  p_receipt_url text
) returns void
language plpgsql
security definer
as $$
declare
  v_order record;
  v_timeout_hours integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  if v_order is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status != 'evidence_requested' then
    raise exception 'Can only resubmit when evidence is requested';
  end if;

  -- Reset timer for verification
  select value::integer into v_timeout_hours
  from public.payment_settings where key = 'timeout_pending_verification_hours';

  update public.orders
  set payment_status = 'pending_verification',
      transfer_number = p_transfer_number,
      receipt_url = p_receipt_url,
      expires_at = now() + (coalesce(v_timeout_hours, 72) || ' hours')::interval
  where id = p_order_id;
end;
$$;
```

---

## Payments App Architecture

### Buyer Orders Feature

```
apps/payments/src/features/orders/
├── domain/
│   ├── types.ts              # OrderWithItems, OrderStatus helpers
│   └── constants.ts          # Query keys, status colors/labels
├── infrastructure/
│   └── orderQueries.ts       # Fetch buyer orders, resubmit evidence
├── application/
│   └── hooks/
│       ├── useMyOrders.ts
│       └── useResubmitEvidence.ts
├── presentation/
│   ├── pages/
│   │   └── OrdersPage.tsx
│   └── components/
│       ├── OrderCard.tsx
│       ├── OrderStatusBadge.tsx
│       ├── ResubmitEvidenceForm.tsx
│       └── OrderItemsList.tsx
└── index.ts
```

### Seller Received Orders Feature

```
apps/payments/src/features/received-orders/
├── domain/
│   ├── types.ts
│   └── constants.ts
├── infrastructure/
│   └── receivedOrderQueries.ts  # Fetch seller orders, update status RPC
├── application/
│   └── hooks/
│       ├── useReceivedOrders.ts
│       └── useOrderActions.ts    # approve, reject, request evidence
├── presentation/
│   ├── pages/
│   │   └── ReceivedOrdersPage.tsx
│   └── components/
│       ├── ReceivedOrderCard.tsx
│       ├── ReceiptViewer.tsx      # Display receipt image + transfer number
│       ├── ActionButtons.tsx      # Approve/Reject/Request Evidence
│       └── SellerNoteInput.tsx    # Note input for reject/request evidence
└── index.ts
```

---

## Shared Types

Both features share order types. Define once in the orders feature and import from received-orders:

```typescript
// orders/domain/types.ts
export interface OrderWithItems {
  id: string;
  user_id: string;
  seller_id: string;
  payment_status: OrderStatus;
  total_cop: number;
  transfer_number: string | null;
  receipt_url: string | null;
  seller_note: string | null;
  expires_at: string | null;
  checkout_session_id: string | null;
  created_at: string;
  payment_method_id: string | null;
  items: OrderItem[];
  // Joined data
  seller_name?: string;
  buyer_name?: string;
}

export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "pending_verification"
  | "evidence_requested"
  | "approved"
  | "rejected"
  | "expired";
```

---

## Status Badge Colors

| Status                 | Color       | Label                |
| ---------------------- | ----------- | -------------------- |
| `pending`              | muted       | Pending              |
| `awaiting_payment`     | warning     | Awaiting Payment     |
| `pending_verification` | info        | Pending Verification |
| `evidence_requested`   | warning     | Evidence Requested   |
| `approved`             | success     | Approved             |
| `rejected`             | destructive | Rejected             |
| `expired`              | muted       | Expired              |

---

## i18n Keys

### Payments — Orders (buyer)

```
orders.title — "My Orders"
orders.noOrders — "No orders yet"
orders.noOrdersHint — "Your purchases will appear here"
orders.status.pending — "Pending"
orders.status.awaiting_payment — "Awaiting Payment"
orders.status.pending_verification — "Pending Verification"
orders.status.evidence_requested — "Evidence Requested"
orders.status.approved — "Approved"
orders.status.rejected — "Rejected"
orders.status.expired — "Expired"
orders.expiresIn — "Expires in {time}"
orders.expired — "This order has expired"
orders.completePayment — "Complete Payment"
orders.waitingForSeller — "Waiting for seller verification"
orders.resubmit — "Resubmit Evidence"
orders.resubmitHint — "The seller requested updated payment proof"
orders.sellerNote — "Seller's Message"
orders.orderCancelled — "Order cancelled"
orders.orderApproved — "Payment verified!"
orders.transferNumber — "Transfer Number"
orders.uploadReceipt — "Upload Receipt"
orders.submit — "Submit"
orders.submitting — "Submitting..."
orders.checkoutDate — "Checkout date"
orders.sellers — "{count} {count, plural, one {seller} other {sellers}}"
```

### Payments — Received Orders (seller)

```
receivedOrders.title — "Received Orders"
receivedOrders.noOrders — "No orders received yet"
receivedOrders.filters.all — "All"
receivedOrders.filters.pendingVerification — "Pending"
receivedOrders.filters.evidenceRequested — "Evidence"
receivedOrders.filters.approved — "Approved"
receivedOrders.filters.rejected — "Rejected"
receivedOrders.approve — "Approve"
receivedOrders.reject — "Reject"
receivedOrders.requestEvidence — "Request Evidence"
receivedOrders.approveConfirm — "Approve this payment?"
receivedOrders.rejectConfirm — "Reject this payment? Stock will be released."
receivedOrders.noteRequired — "Please add a note explaining why"
receivedOrders.notePlaceholder — "Reason for rejection or what evidence is needed..."
receivedOrders.receipt — "Receipt"
receivedOrders.transferNumber — "Transfer Number"
receivedOrders.buyer — "Buyer"
receivedOrders.viewReceipt — "View Receipt"
```

### Studio — Notification Badge

```
studio.pendingOrders — "{count} pending"
studio.viewOrders — "View Orders"
```

---

## Migration

`20260327000000_order_verification.sql`

1. Create `update_order_status` RPC
2. Create `resubmit_evidence` RPC

---

## What Changes Where

| File/Area                                                 | Change                                |
| --------------------------------------------------------- | ------------------------------------- |
| `supabase/migrations/`                                    | New migration with RPCs               |
| `apps/payments/src/features/orders/`                      | New feature: buyer order tracking     |
| `apps/payments/src/features/received-orders/`             | New feature: seller verification      |
| `apps/payments/src/app/[locale]/orders/page.tsx`          | New route                             |
| `apps/payments/src/app/[locale]/orders/received/page.tsx` | New route                             |
| Payments i18n (en/es)                                     | Orders + received orders keys         |
| `apps/studio/`                                            | Notification badge for pending orders |
| Studio i18n (en/es)                                       | Badge keys                            |
