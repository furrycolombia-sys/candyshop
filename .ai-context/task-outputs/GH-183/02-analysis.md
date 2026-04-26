# Analysis: GH-183 — E2E Test Suite Deep Coverage Map

## All 22 Spec Files Surveyed

| #   | File                                            | App      | Tests      | Unique Coverage                                                                                                            | Action     |
| --- | ----------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | `auth/e2e/full-purchase-flow.spec.ts`           | auth     | ~20 serial | **CRITICAL** — 2-seller simultaneous purchase, multi-seller cart count=2 assertions                                        | **KEEP**   |
| 2   | `auth/e2e/permission-management.spec.ts`        | auth     | 5 serial   | 35-permission loop with fresh session per call                                                                             | **KEEP**   |
| 3   | `auth/e2e/delegated-admin-flow.spec.ts`         | auth     | 8 serial   | Full delegation lifecycle — evidence request, resubmission, approval                                                       | **KEEP**   |
| 4   | `auth/e2e/receipt-reference-flow.spec.ts`       | auth     | 6 serial   | SHA-256 byte-level receipt integrity (single seller), `requires_receipt + requires_transfer_number`                        | **KEEP**   |
| 5   | `auth/e2e/receipt-delegate-flow.spec.ts`        | auth     | 6 serial   | Delegate-perspective receipt visibility + SHA-256 byte integrity                                                           | **KEEP**   |
| 6   | `auth/e2e/studio-ux-improvements.spec.ts`       | auth     | 4 serial   | `data-cover="true"` attr, per-product delegate mgmt, GripVertical drag handles                                             | **KEEP**   |
| 7   | `auth/e2e/admin-users-export-receipts.spec.ts`  | auth     | 1          | XLS Receipts worksheet — XML structure, `storagePath`, base64 payload **(Wave 4)**                                         | **KEEP**   |
| 8   | `auth/e2e/checkout-stock-integrity.spec.ts`     | auth     | 1          | Tampered cart (`quantity > max_quantity`) — backend returns `{ hasStockIssues: true, methods: [] }`, UI hides payment form | **KEEP**   |
| 9   | `auth/e2e/mobile-layout.spec.ts`                | auth     | 1          | iPhone 12 viewport, `scrollWidth <= clientWidth + 1` for store/product/checkout, mobile sidebar trigger                    | **KEEP**   |
| 10  | `auth/e2e/smoke-all-apps.spec.ts`               | auth     | 5          | Authenticated nav across all apps, login page renders (unauthenticated)                                                    | **KEEP**   |
| 11  | `auth/e2e/auth-session.spec.ts`                 | auth     | 3 (1 skip) | "login page renders" (dup of smoke), "session persists" (fixme in single-origin, covered by smoke)                         | **DELETE** |
| 12  | `auth/e2e/screenshot-proof.spec.ts`             | auth     | 5 serial   | Same behaviors as `studio-ux-improvements.spec.ts` + screenshot snapshots (not automated assertions)                       | **DELETE** |
| 13  | `auth/e2e/discord-login.spec.ts`                | auth     | 1 (skip)   | `test.skip(true, ...)` — **NEVER runs in CI**                                                                              | **DELETE** |
| 14  | `auth/e2e/google-login.spec.ts`                 | auth     | 1 (skip)   | `test.skip(true, ...)` — **NEVER runs in CI**                                                                              | **DELETE** |
| 15  | `store/e2e/theme-and-language.spec.ts`          | store    | 5          | Dark/light theme cookie persistence, locale switching, cross-app nav with locale                                           | **KEEP**   |
| 16  | `payments/e2e/checkout-order-integrity.spec.ts` | payments | 3 serial   | GH-179 regression guard — no order on page-load/form-fill, exactly 1 `pending_verification` on submit                      | **KEEP**   |
| 17  | `payments/e2e/seller-reports.spec.ts`           | payments | 10         | **Data isolation** (seller only sees own orders), filter/URL params, access control                                        | **KEEP**   |
| 18  | `admin/e2e/reports.spec.ts`                     | admin    | 11         | Admin reports with `admin.reports` permission, filter/URL params, access control                                           | **KEEP**   |
| 19  | `admin/e2e/users-export-receipts-real.spec.ts`  | admin    | 1          | XLS download + XML assertions — **exact duplicate of Wave 4** **(Wave 3)**                                                 | **DELETE** |
| 20  | `admin/e2e/users-export-receipts.spec.ts`       | admin    | 1          | Download-only check (`filename.match(/\.xls$/i)`) — superseded by Wave 4's XML+base64 **(Wave 2)**                         | **DELETE** |
| 21  | `admin/e2e/audit-log.spec.ts`                   | admin    | 6          | Audit log page, filter bar, action-type filter, table/empty state, `audit.read` permission check                           | **KEEP**   |
| 22  | `landing/e2e/navbar-auth-state.spec.ts`         | landing  | 1          | Signed-out navbar: public links visible, protected links hidden                                                            | **KEEP**   |

---

## Deletions — Rationale

### 1. `apps/auth/e2e/discord-login.spec.ts` — NEVER RUNS

```typescript
test.skip(
  true,
  "Discord OAuth requires live credentials and manual execution — not suitable for automated runs",
);
```

No CI value. No coverage lost.

### 2. `apps/auth/e2e/google-login.spec.ts` — NEVER RUNS

```typescript
test.skip(
  true,
  "Google OAuth requires live credentials and manual execution — not suitable for automated runs",
);
```

No CI value. No coverage lost.

### 3. `apps/auth/e2e/screenshot-proof.spec.ts` — BEHAVIORAL DUPLICATE

Tests cover image selection (`data-cover="true"`), per-product delegate management, and GripVertical drag handles — all already asserted in `studio-ux-improvements.spec.ts`. The only addition is `snapElement()` / `snapPage()` screenshot captures that are one-off human-review artifacts, not automated assertions. Removing this file loses **zero behavioral coverage**.

### 4. `apps/auth/e2e/auth-session.spec.ts` — COVERED BY SMOKE

Two active tests:

- "login page renders with social buttons" → already in `smoke-all-apps.spec.ts`
- "authenticated session persists across apps" → has `test.fixme(isSingleOriginPathRouting, ...)` in some configs; `smoke-all-apps.spec.ts` covers session persistence more comprehensively across all 5 apps with the `authenticatedPage` fixture

The one skip is the Google authorize URL check — already removed with `google-login.spec.ts`.

### 5. `apps/admin/e2e/users-export-receipts-real.spec.ts` (Wave 3) — IDENTICAL TO WAVE 4

Performs the same XLS download → read bytes → assert XML structure → assert `storagePath` → assert `expectedReceiptBase64` as `apps/auth/e2e/admin-users-export-receipts.spec.ts` (Wave 4). Wave 4 is the authoritative file (listed in the original issue scope). Wave 3 is in `apps/admin/` instead of `apps/auth/` but tests via the same admin URL. Zero unique coverage.

### 6. `apps/admin/e2e/users-export-receipts.spec.ts` (Wave 2) — SUPERSEDED

Only checks `download.suggestedFilename().match(/\.xls$/i)`. No XML structure, no receipt worksheet, no base64 payload. Wave 4 (`admin-users-export-receipts.spec.ts`) does all of this plus the filename check.

---

## Critical Path Preservation Matrix

| Critical Path                                      | Primary Coverage                         | Status After Refactor |
| -------------------------------------------------- | ---------------------------------------- | --------------------- |
| Multi-seller cart (count=2, 2 pending, 2 approved) | `full-purchase-flow.spec.ts` Phases 3–6  | ✅ KEPT               |
| Ghost-write regression GH-179                      | `checkout-order-integrity.spec.ts`       | ✅ KEPT               |
| Seller data isolation                              | `seller-reports.spec.ts`                 | ✅ KEPT               |
| SHA-256 receipt byte integrity                     | `receipt-reference-flow.spec.ts` Phase 5 | ✅ KEPT               |
| SHA-256 delegate-perspective receipt               | `receipt-delegate-flow.spec.ts` Phase 4  | ✅ KEPT               |
| Permission matrix (35-permission loop)             | `permission-management.spec.ts`          | ✅ KEPT               |
| Keyboard DnD (drag handles)                        | `studio-ux-improvements.spec.ts` Phase 4 | ✅ KEPT               |
| XLS XML + base64 receipt export                    | `admin-users-export-receipts.spec.ts`    | ✅ KEPT               |
| Tampered cart stock validation                     | `checkout-stock-integrity.spec.ts`       | ✅ KEPT               |
| Delegate lifecycle (evidence request + resubmit)   | `delegated-admin-flow.spec.ts`           | ✅ KEPT               |

---

## Result

| Metric                     | Before | After |
| -------------------------- | ------ | ----- |
| Spec files                 | 22     | 16    |
| Always-skipped files       | 2      | 0     |
| Behavioral duplicate files | 2      | 0     |
| Superseded export files    | 2      | 0     |

**6 files deleted, 0 behavioral coverage lost.**
