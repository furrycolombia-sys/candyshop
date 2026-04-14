# Orders Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the buyer order card for readability (vertical layout, items always visible) and make seller approval/rejection irreversible with inline checkbox confirmation.

**Architecture:** Rewrite `OrderCard.tsx` layout from horizontal accordion to vertical card. Create `ConfirmActionPanel.tsx` for the inline confirmation with checkbox + warning. Update `ActionButtons.tsx` to use inline confirmation instead of `globalThis.confirm()`. Update E2E test to check the new checkbox flow.

**Tech Stack:** React 19, Tailwind CSS v4, next-intl, Playwright

---

## File Structure

### New files

| File                                                                                        | Responsibility                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/payments/src/features/received-orders/presentation/components/ConfirmActionPanel.tsx` | Inline confirmation panel with warning, checkbox, confirm/cancel buttons |

### Modified files

| File                                                                                   | Change                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `apps/payments/src/features/orders/presentation/components/OrderCard.tsx`              | Vertical layout, items always visible, status banner at top     |
| `apps/payments/src/features/received-orders/presentation/components/ActionButtons.tsx` | Replace `globalThis.confirm()` with inline `ConfirmActionPanel` |
| `apps/payments/src/shared/infrastructure/i18n/messages/en.json`                        | Add confirmation i18n keys                                      |
| `apps/payments/src/shared/infrastructure/i18n/messages/es.json`                        | Add confirmation i18n keys                                      |
| `apps/auth/e2e/full-purchase-flow.spec.ts`                                             | Phase 6: check confirmation checkbox before approving           |

---

### Task 1: Add i18n keys for confirmation flow

**Files:**

- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add confirmation keys to en.json**

In the `"receivedOrders"` block, add these keys:

```json
"permanentAction": "Permanent Action",
"approveWarning": "This action is permanent and cannot be undone. The buyer will be notified and stock will be committed.",
"approveCheckbox": "I have verified the receipt and transfer number",
"confirmApprove": "Confirm Approval — Irreversible",
"rejectWarning": "This will release reserved stock and cancel the order permanently. The buyer will be notified.",
"rejectCheckbox": "I understand this cannot be undone",
"confirmReject": "Confirm Rejection — Irreversible"
```

- [ ] **Step 2: Add confirmation keys to es.json**

```json
"permanentAction": "Accion Permanente",
"approveWarning": "Esta accion es permanente y no se puede deshacer. El comprador sera notificado y el inventario sera comprometido.",
"approveCheckbox": "He verificado el recibo y el numero de transferencia",
"confirmApprove": "Confirmar Aprobacion — Irreversible",
"rejectWarning": "Esto liberara el inventario reservado y cancelara el pedido permanentemente. El comprador sera notificado.",
"rejectCheckbox": "Entiendo que esto no se puede deshacer",
"confirmReject": "Confirmar Rechazo — Irreversible"
```

- [ ] **Step 3: Commit**

```bash
git add apps/payments/src/shared/infrastructure/i18n/messages/
git commit -m "feat(payments): add i18n keys for irreversible confirmation flow"
```

---

### Task 2: Create ConfirmActionPanel component

**Files:**

- Create: `apps/payments/src/features/received-orders/presentation/components/ConfirmActionPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

interface ConfirmActionPanelProps {
  warning: string;
  checkboxLabel: string;
  confirmLabel: string;
  variant: "approve" | "reject";
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

export function ConfirmActionPanel({
  warning,
  checkboxLabel,
  confirmLabel,
  variant,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmActionPanelProps) {
  const [checked, setChecked] = useState(false);

  const handleConfirm = useCallback(() => {
    if (checked) onConfirm();
  }, [checked, onConfirm]);

  const borderColor =
    variant === "approve" ? "border-success/50" : "border-destructive/50";
  const bgColor = variant === "approve" ? "bg-success/5" : "bg-destructive/5";
  const btnBg =
    variant === "approve"
      ? "bg-success text-success-foreground"
      : "bg-destructive text-destructive-foreground";

  return (
    <div
      className={`border-3 ${borderColor} ${bgColor} p-4 space-y-3`}
      {...tid("confirm-action-panel")}
    >
      {/* Warning */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-5 shrink-0 text-warning" />
        <p className="text-sm">{warning}</p>
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-foreground"
          {...tid("confirm-checkbox")}
        />
        <span className="text-sm font-medium">{checkboxLabel}</span>
      </label>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!checked || isPending}
          className={`nb-btn rounded-lg border-3 border-foreground px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider ${btnBg} disabled:opacity-40 disabled:cursor-not-allowed`}
          {...tid("confirm-action-submit")}
        >
          {isPending ? "..." : confirmLabel}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="nb-btn rounded-lg border-3 border-foreground bg-background px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider"
          {...tid("confirm-action-cancel")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/payments/src/features/received-orders/presentation/components/ConfirmActionPanel.tsx
git commit -m "feat(payments): add ConfirmActionPanel with checkbox verification"
```

---

### Task 3: Update ActionButtons to use inline confirmation

**Files:**

- Modify: `apps/payments/src/features/received-orders/presentation/components/ActionButtons.tsx`

- [ ] **Step 1: Replace confirm() with ConfirmActionPanel**

Replace the entire `ActionButtons.tsx` with:

```tsx
"use client";

import { Check, MessageSquareWarning, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";
import { Button } from "ui";

import { ConfirmActionPanel } from "./ConfirmActionPanel";
import { SellerNoteInput } from "./SellerNoteInput";

import type {
  OrderStatus,
  SellerAction,
} from "@/features/received-orders/domain/types";

interface ActionButtonsProps {
  orderId: string;
  status: OrderStatus;
  onAction: (action: SellerAction, note?: string) => void;
  isPending: boolean;
}

type ActionMode = "approve" | "reject" | "evidence" | null;

export function ActionButtons({
  orderId,
  status,
  onAction,
  isPending,
}: ActionButtonsProps) {
  const t = useTranslations("receivedOrders");
  const [mode, setMode] = useState<ActionMode>(null);

  const canApprove =
    status === "pending_verification" || status === "evidence_requested";
  const canReject =
    status === "pending_verification" || status === "evidence_requested";
  const canRequestEvidence = status === "pending_verification";

  const handleConfirmApprove = useCallback(() => {
    onAction("approved");
    setMode(null);
  }, [onAction]);

  const handleNoteSubmit = useCallback(
    (note: string) => {
      if (mode === "reject") {
        onAction("rejected", note);
      } else if (mode === "evidence") {
        onAction("evidence_requested", note);
      }
      setMode(null);
    },
    [mode, onAction],
  );

  if (!canApprove && !canReject) return null;

  // Approve confirmation panel
  if (mode === "approve") {
    return (
      <ConfirmActionPanel
        warning={t("approveWarning")}
        checkboxLabel={t("approveCheckbox")}
        confirmLabel={t("confirmApprove")}
        variant="approve"
        onConfirm={handleConfirmApprove}
        onCancel={() => setMode(null)}
        isPending={isPending}
      />
    );
  }

  // Reject confirmation — note input + confirmation
  if (mode === "reject") {
    return (
      <SellerNoteInput
        onSubmit={handleNoteSubmit}
        onCancel={() => setMode(null)}
        isPending={isPending}
        placeholder={t("notePlaceholder")}
        requireConfirmation
        confirmWarning={t("rejectWarning")}
        confirmCheckboxLabel={t("rejectCheckbox")}
        confirmButtonLabel={t("confirmReject")}
      />
    );
  }

  // Evidence request — simple note input (not destructive)
  if (mode === "evidence") {
    return (
      <SellerNoteInput
        onSubmit={handleNoteSubmit}
        onCancel={() => setMode(null)}
        isPending={isPending}
        placeholder={t("notePlaceholder")}
      />
    );
  }

  // Default: action buttons
  return (
    <div className="flex flex-col gap-3" {...tid(`order-actions-${orderId}`)}>
      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <Button
            type="button"
            onClick={() => setMode("approve")}
            disabled={isPending}
            className="nb-btn rounded-lg border-3 border-foreground bg-success px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-success-foreground"
            {...tid(`order-approve-${orderId}`)}
          >
            <Check className="size-4" />
            {t("approve")}
          </Button>
        )}
        {canReject && (
          <Button
            type="button"
            onClick={() => setMode("reject")}
            disabled={isPending}
            className="nb-btn rounded-lg border-3 border-foreground bg-destructive px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-destructive-foreground"
            {...tid(`order-reject-${orderId}`)}
          >
            <X className="size-4" />
            {t("reject")}
          </Button>
        )}
        {canRequestEvidence && (
          <Button
            type="button"
            onClick={() => setMode("evidence")}
            disabled={isPending}
            className="nb-btn rounded-lg border-3 border-foreground bg-warning px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-warning-foreground"
            {...tid(`order-evidence-${orderId}`)}
          >
            <MessageSquareWarning className="size-4" />
            {t("requestEvidence")}
          </Button>
        )}
      </div>
    </div>
  );
}
```

Note: The `SellerNoteInput` component needs a `requireConfirmation` prop for reject flow. If adding that prop is too complex for this task, the reject flow can use ConfirmActionPanel with a separate note textarea. Handle this during implementation based on the existing SellerNoteInput structure.

- [ ] **Step 2: Commit**

```bash
git add apps/payments/src/features/received-orders/presentation/components/ActionButtons.tsx
git commit -m "feat(payments): replace confirm() with inline irreversible confirmation"
```

---

### Task 4: Redesign OrderCard layout

**Files:**

- Modify: `apps/payments/src/features/orders/presentation/components/OrderCard.tsx`

- [ ] **Step 1: Rewrite to vertical layout with items visible**

Replace the entire `OrderCard.tsx` with:

```tsx
"use client";

import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useState } from "react";
import { tid } from "shared";

import { useResubmitEvidence } from "@/features/orders/application/hooks/useResubmitEvidence";
import { STATUS_COLORS } from "@/features/orders/domain/constants";
import type { OrderWithItems } from "@/features/orders/domain/types";
import { ExpirationLabel } from "@/features/orders/presentation/components/ExpirationLabel";
import { OrderItemsList } from "@/features/orders/presentation/components/OrderItemsList";
import { OrderStatusBadge } from "@/features/orders/presentation/components/OrderStatusBadge";
import { StatusContent } from "@/features/orders/presentation/components/StatusContent";
import { formatCop } from "@/shared/application/utils/formatCop";

const TERMINAL_STATUSES = new Set(["approved", "rejected", "expired"]);

interface OrderCardProps {
  order: OrderWithItems;
}

export function OrderCard({ order }: OrderCardProps) {
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(
    order.payment_status === "evidence_requested",
  );
  const resubmit = useResubmitEvidence();

  const handleResubmit = useCallback(
    (transferNumber: string, receiptFile: File | null) => {
      resubmit.mutate({ orderId: order.id, transferNumber, receiptFile });
    },
    [resubmit, order.id],
  );

  const statusColors =
    STATUS_COLORS[order.payment_status] ?? STATUS_COLORS.pending;
  const isTerminal = TERMINAL_STATUSES.has(order.payment_status);

  return (
    <div
      className="nb-shadow border-3 border-foreground bg-background overflow-hidden"
      {...tid(`order-card-${order.id}`)}
    >
      {/* Status banner — full width at top */}
      <div className={`px-4 py-2.5 ${statusColors}`}>
        <OrderStatusBadge status={order.payment_status} />
      </div>

      {/* Seller */}
      <div className="px-4 pt-3 pb-1">
        <span className="font-mono text-xs text-muted-foreground">
          {order.seller_name}
        </span>
      </div>

      {/* Items — always visible */}
      <div className="px-4 py-2">
        <OrderItemsList items={order.items} />
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t-2 border-dashed border-muted-foreground/20 px-4 py-3">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Total
        </span>
        <span className="font-display text-lg font-extrabold">
          {formatCop(order.total_cop)}
        </span>
      </div>

      {/* Expiration — if applicable */}
      {order.expires_at && !isTerminal && (
        <div className="flex items-center gap-1.5 border-t border-muted-foreground/10 px-4 py-2 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <ExpirationLabel expiresAt={order.expires_at} />
        </div>
      )}

      {/* Expand toggle — for details (resubmit form, status messages) */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="flex w-full items-center justify-center gap-1 border-t-2 border-muted-foreground/10 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30"
        aria-expanded={isExpanded}
        {...tid(`order-card-toggle-${order.id}`)}
      >
        {isExpanded ? (
          <>
            Hide details <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            View details <ChevronDown className="size-3" />
          </>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t-3 border-foreground p-4">
          <StatusContent
            order={order}
            onResubmit={handleResubmit}
            isPending={resubmit.isPending}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/payments/src/features/orders/presentation/components/OrderCard.tsx
git commit -m "feat(payments): redesign order card — vertical layout, items always visible"
```

---

### Task 5: Update E2E test for new approval flow

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts`

- [ ] **Step 1: Update Phase 6 to use checkbox confirmation**

Replace Phase 6 in the E2E test:

Find the Phase 6 test and replace the dialog-based approval with:

```typescript
test("Phase 6: seller approves the order", async ({ context, page }) => {
  await injectSession(context, seller);

  await page.goto(`${PAYMENTS}/en/sales`);
  await page.waitForLoadState("networkidle");

  // Find and click the approve button
  const approveBtn = page.getByTestId(/^order-approve-/).first();
  await expect(approveBtn).toBeVisible({ timeout: 10_000 });
  await snap(page, "seller-order-received");

  // Click approve — opens inline confirmation panel
  await approveBtn.click();
  await snap(page, "seller-approve-confirmation");

  // Check the verification checkbox
  const checkbox = page.getByTestId("confirm-checkbox");
  await expect(checkbox).toBeVisible();
  await checkbox.check();

  // Click the irreversible confirm button
  await page.getByTestId("confirm-action-submit").click();

  // Wait for mutation to complete, then reload
  await page.waitForTimeout(3000);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Approve button should be gone after approval
  await expect(page.getByTestId(/^order-approve-/).first()).not.toBeVisible({
    timeout: 15_000,
  });
  await snap(page, "seller-order-approved");
});
```

- [ ] **Step 2: Remove the `page.on("dialog")` handler** (no longer needed since we don't use `globalThis.confirm()`)

- [ ] **Step 3: Run the E2E test to verify**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed --timeout 120000
```

Expected: All 6 phases pass.

- [ ] **Step 4: Commit**

```bash
git add apps/auth/e2e/full-purchase-flow.spec.ts
git commit -m "test(e2e): update Phase 6 for checkbox-based approval confirmation"
```

---

### Task 6: Verify everything works

- [ ] **Step 1: Run unit tests**

```bash
cd /z/Github/candystore && pnpm test
```

- [ ] **Step 2: Run lint and typecheck**

```bash
pnpm lint && pnpm typecheck
```

- [ ] **Step 3: Run E2E with screenshots**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed --timeout 120000
```

- [ ] **Step 4: Verify the new screenshots show the redesigned card and confirmation panel**

Check `apps/auth/e2e/screenshots/` for the new images.

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(payments): resolve issues from orders redesign"
```
