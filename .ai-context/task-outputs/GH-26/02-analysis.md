# Analysis: GH-26

## Branch Context

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| **Branch**    | `chore/GH-26_Full-Project-Code-Review` |
| **Type**      | `chore`                                |
| **Source**    | `develop`                              |
| **PR Target** | `develop`                              |

## Scope Adjustment

The code review was performed on `feat/GH-25_CRUD-Permissions`. The `users` feature (20 files) only exists on that branch, not on `develop`. Issues specific to the users feature (BUG-001 `getInitials`, TEST-001 missing users tests, SOLID-004 `as unknown as` casts in userPermissionQueries) will be addressed when GH-25 is merged. **This task focuses on issues that exist on `develop`.**

---

## Critical Issues (on develop)

### 1. ARCH-001: Dashboard imports from Audit

- **File:** `apps/admin/src/features/dashboard/presentation/pages/DashboardPage.tsx:7`
- **Import:** `import { useAuditLog } from "@/features/audit/application/useAuditLog"`
- **Fix:** Extract `useRecentActivity` hook to `@/shared/application/hooks/`

### 2. ARCH-002: Hardcoded Stat Values

- **File:** `apps/admin/src/features/dashboard/presentation/pages/DashboardPage.tsx:15-44`
- **Data:** `"1,247"`, `"8"`, `"3"`, `"99.9%"` — fake values displayed as real
- **Fix:** Either fetch real data or show placeholder/skeleton

### 3. SEC-001: Supabase Anon Key in .env.example

- **File:** `.env.example:107`
- **Current:** `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- **Fix:** Replace with `YOUR_SUPABASE_ANON_KEY` placeholder

### 4. BUG-002: No Error Boundaries

- **Files:** Zero `error.tsx` or `global-error.tsx` in any of 7 apps
- **Fix:** Add `error.tsx` and `global-error.tsx` to all apps

---

## High-Priority Warnings (on develop)

### Cross-Feature Imports (3 confirmed)

| Source Feature    | Target Feature | File                      |
| ----------------- | -------------- | ------------------------- |
| dashboard (admin) | audit          | `DashboardPage.tsx:7`     |
| products (store)  | cart           | `ProductDetailPage.tsx:6` |
| products (studio) | orders         | `ProductListPage.tsx:10`  |

### DRY: `locale === "es"` Pattern (8 files)

Files using `locale === "es"` instead of `i18nField()`:

- `payments/payment-methods/domain/utils.ts`
- `payments/received-orders/.../ReceivedOrderCard.tsx`
- `payments/orders/.../OrderItemsList.tsx`
- `payments/checkout/.../useCartFromCookie.ts`
- `payments/checkout/.../PaymentMethodSelector.tsx`
- `admin/payment-method-types/.../PaymentMethodTypeTable.tsx`
- `studio/products/.../TemplatePicker.tsx`
- `admin/templates/.../TemplateTable.tsx`

### Security: Receipt Upload (3 files in payments)

- `checkout/domain/constants.ts` — `ACCEPTED_RECEIPT_TYPES = "image/*"` (no MIME validation)
- `checkout/infrastructure/receiptStorage.ts` — Unsanitized `file.name` in storage path
- `received-orders/.../ReceiptViewer.tsx` — Unsanitized `receiptUrl` as href

### Styling: Tailwind Classes in JS Constants (10+ files)

Pattern: `PILL_BASE`, `PILL_ACTIVE`, `PILL_INACTIVE`, `TABLE_HEADER_CLASS` etc.
Appears in: store, studio, payments, admin

### DRY: Duplicate Constants Between Apps

- `categoryConstants.ts` — store + studio
- `PRODUCT_TYPES`/`PRODUCT_CATEGORIES` — store + studio
- Receipt constants — payments checkout + orders
- Time constants — payments + admin
- `STATUS_COLORS` — payments orders + received-orders

---

## Files to Modify (confirmed on develop)

| File                                    | Action | Issue                                               |
| --------------------------------------- | ------ | --------------------------------------------------- |
| `.env.example:107`                      | Modify | SEC-001: Replace anon key                           |
| `apps/admin/.../DashboardPage.tsx`      | Modify | ARCH-001/002: Fix imports + hardcoded stats         |
| `apps/store/.../ProductDetailPage.tsx`  | Modify | ARCH-003: Move CartDrawer to shared                 |
| `apps/studio/.../ProductListPage.tsx`   | Modify | ARCH-004: Fix cross-feature import                  |
| 8 files with `locale === "es"`          | Modify | DRY-003: Use i18nField()                            |
| `payments/.../receiptStorage.ts`        | Modify | SEC-003: Sanitize file paths                        |
| `payments/.../ReceiptViewer.tsx`        | Modify | SEC-004: Validate href URL                          |
| All 7 `apps/*/src/app/[locale]/`        | Create | BUG-002: Add error.tsx + global-error.tsx           |
| `packages/ui/src/styles/utilities.css`  | Modify | STYLE-004: Replace hardcoded hex in bg-dots         |
| 3 landing components                    | Modify | STYLE-002: border-t-[3px] → border-t-3              |
| `payments/.../ResubmitEvidenceForm.tsx` | Modify | STYLE-003: text-white → text-destructive-foreground |

## Files to Create

| File                                                           | Purpose                                |
| -------------------------------------------------------------- | -------------------------------------- |
| `apps/*/src/app/[locale]/error.tsx` (7 apps)                   | Error boundaries                       |
| `apps/*/src/app/global-error.tsx` (7 apps)                     | Global error boundaries                |
| `apps/admin/src/shared/application/hooks/useRecentActivity.ts` | Extract from audit import              |
| `packages/shared/src/constants/time.ts` updates                | Consolidate time constants             |
| `apps/payments/src/shared/domain/constants.ts` updates         | Consolidate receipt + status constants |

## Key Insights

1. **BUG-001 (getInitials crash) doesn't exist on develop** — only on GH-25 branch
2. **Users feature (TEST-001) doesn't exist on develop** — only on GH-25 branch
3. **Cross-feature imports are real violations** — 3 confirmed on develop
4. **`i18nField()` already exists** in `packages/shared/src/utils/i18nField.ts` — just underused
5. **Error boundaries are truly missing** — zero across all 7 apps
6. **STYLE issues are mechanical** — straightforward find-replace fixes
