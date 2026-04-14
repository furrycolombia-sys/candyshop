# Orders Redesign: Card Layout + Irreversible Approval

## Goal

Redesign the buyer's "My Purchases" order cards for better readability, and make seller approve/reject actions irreversible with a multi-step confirmation flow.

## Part 1: Buyer Order Card Redesign

### Current Issues

- Everything crammed into one horizontal row
- Seller email dominates the card in a huge font
- Can't see what was purchased without expanding
- Status badge and price overlap

### New Layout

The card becomes a vertical stack with items always visible:

```
┌──────────────────────────────────────────┐
│ ☑ APPROVED                               │  ← Status badge, full-width, colored bg
│                                          │
│ Seller: e2e-seller@test.invalid          │  ← Smaller, secondary
│                                          │
│ 1x E2E Test Product          $10,000 COP │  ← Items always visible
│                                          │
│ Total                        $10,000 COP │  ← Clear total
│                                          │
│ ⏱ Expires in 47h                         │  ← If applicable
│                                          │
│ [▼ View details]                         │  ← Expand for resubmit form, notes
└──────────────────────────────────────────┘
```

### Structure

1. **Status banner** — full-width colored bar at top. Background color matches status (success/warning/destructive/info/muted).
2. **Seller name** — small mono text, not the headline.
3. **Items list** — always visible. Shows product name, quantity, unit price. No expand needed.
4. **Total** — right-aligned, bold, separated by a dashed border.
5. **Expiration** — if applicable, shown below total with clock icon.
6. **Expand toggle** — "View details" expands to show: status-specific content (resubmit form for evidence_requested, approval message, rejection reason, etc.)

### File Changes

- `OrderCard.tsx` — rewrite layout from horizontal accordion to vertical card with items visible
- `OrderStatusBadge.tsx` — make it a full-width banner variant (not just an inline badge)

## Part 2: Irreversible Seller Approval

### Current Issues

- Single `globalThis.confirm()` browser dialog — too easy to click through
- No indication that the action is permanent
- No verification that the seller actually checked the receipt

### New Approval Flow

Replace the browser `confirm()` with an inline confirmation panel that requires explicit verification.

#### Approve (irreversible)

1. Seller clicks "Approve"
2. An inline confirmation panel expands below the button:
   ```
   ┌────────────────────────────────────────────┐
   │ ⚠ PERMANENT ACTION                         │
   │                                            │
   │ This action cannot be undone. The buyer    │
   │ will be notified and stock will be         │
   │ committed.                                 │
   │                                            │
   │ ☐ I have verified the receipt and          │
   │   transfer number                          │
   │                                            │
   │ [Confirm Approval — Irreversible]  [Cancel]│
   └────────────────────────────────────────────┘
   ```
3. The "Confirm Approval" button is **disabled** until the checkbox is checked.
4. Clicking confirm calls the `update_order_status` RPC.

#### Reject (irreversible — releases stock)

1. Seller clicks "Reject"
2. Inline panel expands with:
   - Warning: "This will release reserved stock and cancel the order permanently."
   - Required seller note (reason for rejection)
   - Checkbox: "I understand this cannot be undone"
   - "Confirm Rejection — Irreversible" button (disabled until checkbox + note filled)
3. Cancel returns to the action buttons.

#### Request Evidence (not destructive — stays simple)

No confirmation needed. Seller enters a note and submits. This just asks the buyer for more info — no permanent state change.

### File Changes

- `ActionButtons.tsx` — replace `globalThis.confirm()` with inline confirmation panel
- New component: `ConfirmActionPanel.tsx` — reusable confirmation panel with checkbox + warning
- i18n keys added for warning texts, checkbox labels, confirm button labels

## i18n Keys

### English (`en.json`)

```json
"receivedOrders": {
  "approveWarning": "This action is permanent and cannot be undone. The buyer will be notified and stock will be committed.",
  "approveCheckbox": "I have verified the receipt and transfer number",
  "confirmApprove": "Confirm Approval — Irreversible",
  "rejectWarning": "This will release reserved stock and cancel the order permanently. The buyer will be notified.",
  "rejectCheckbox": "I understand this cannot be undone",
  "confirmReject": "Confirm Rejection — Irreversible",
  "permanentAction": "Permanent Action"
}
```

### Spanish (`es.json`)

```json
"receivedOrders": {
  "approveWarning": "Esta accion es permanente y no se puede deshacer. El comprador sera notificado y el inventario sera comprometido.",
  "approveCheckbox": "He verificado el recibo y el numero de transferencia",
  "confirmApprove": "Confirmar Aprobacion — Irreversible",
  "rejectWarning": "Esto liberara el inventario reservado y cancelara el pedido permanentemente. El comprador sera notificado.",
  "rejectCheckbox": "Entiendo que esto no se puede deshacer",
  "confirmReject": "Confirmar Rechazo — Irreversible",
  "permanentAction": "Accion Permanente"
}
```

## Testing

- Update E2E test Phase 6: seller must check the verification checkbox before confirming approval
- Unit tests for `ConfirmActionPanel` — renders warning, checkbox disables button, clicking confirm calls handler
- Unit tests for `OrderCard` — items visible without expanding, status banner renders correctly

## Files Summary

### New

- `apps/payments/src/features/received-orders/presentation/components/ConfirmActionPanel.tsx`

### Modified

- `apps/payments/src/features/orders/presentation/components/OrderCard.tsx` — vertical layout, items visible
- `apps/payments/src/features/orders/presentation/components/OrderStatusBadge.tsx` — banner variant
- `apps/payments/src/features/received-orders/presentation/components/ActionButtons.tsx` — inline confirmation
- `apps/payments/src/shared/infrastructure/i18n/messages/en.json` — new keys
- `apps/payments/src/shared/infrastructure/i18n/messages/es.json` — new keys
- `apps/auth/e2e/full-purchase-flow.spec.ts` — Phase 6 updated for checkbox confirmation
