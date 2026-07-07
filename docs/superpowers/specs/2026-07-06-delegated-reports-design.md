# Delegated Reports — Design Spec

**Date:** 2026-07-06
**App:** `apps/payments`
**Status:** Approved for planning

---

## Summary

Let delegates view and export a sales report over **only the products delegated to them**, reusing the seller's existing report page and Excel export unchanged. The report is **literally the same** as the owner's — same table, same filters, same `.xls` — the only difference is the data source (delegated items instead of all the owner's items).

This is the existing `seller_admins` delegation model (the assigned-orders approve / decline / request-more-info flow) applied to reports. No new report/export functionality is created.

---

## Goals

- A delegate with the right permission sees a **Delegated Reports** menu item under the payments **DELEGATE** sidebar section (next to Assigned).
- The delegate opens the same report UI the owner has, scoped to the products a seller delegated to them.
- The delegate can export the **identical** `.xls` the seller exports.
- Two granular permissions: one to view, one to export.
- TDD (Vitest unit tests first) + Playwright E2E coverage.

## Non-Goals

- No new report columns, no "Seller" column, no layout changes.
- No changes to the owner's `/reports` page or its export.
- No new Excel implementation — reuse `exportSellerOrdersToExcel` as-is.
- No new orders/receipts RLS — the existing `orders_delegate_read` and receipt-delegate-read policies already grant the data.
- No changes to the admin (`admin.reports`, exceljs) reporting path.

---

## Delegation model (reused, unchanged)

- `seller_admins(seller_id, admin_user_id, product_id NOT NULL, permissions text[])` — per-product delegation rows.
- `useCurrentUserPermissions()` merges each delegate's `seller_admins.permissions[]` straight into `grantedKeys`. Granting a report permission = adding its key to the array when a seller delegates a product (studio UI).
- RLS `orders_delegate_read` already lets a delegate read the delegating seller's orders; receipt-delegate-read policies already grant signed-URL access. **Nothing new here.**

---

## Permissions

Two new delegatable capability keys, registered exactly like `orders.approve` is today:

| Key              | Grants                                          |
| ---------------- | ----------------------------------------------- |
| `reports.read`   | Reveals the Delegated Reports menu + page       |
| `reports.export` | Renders the export button on the delegated page |

Registered in:

1. **Catalog migration** — `supabase/migrations/<ts>_delegate_reports_permissions.sql`, mirroring `20260421000000_admin_reports_permission.sql` (insert into `permissions` + a `global` `resource_permissions` row; `reports.read` depends_on `orders.read`, `reports.export` depends_on `reports.read`). No RLS added.
2. **Admin catalog** — new `reports` group in `apps/admin/src/features/users/domain/constants.ts` `PERMISSION_GROUPS` (`["reports.read","reports.export"]`).
3. **Studio delegate picker** — extend `DelegatePermission` union (`apps/studio/src/features/seller-admins/domain/types.ts`) and `DELEGATE_PERMISSIONS` (`.../domain/constants.ts`) so a seller can tick them when delegating a product.

> Note: gating is app-level (like `orders.approve` gating the Assigned nav + `can_manage`). RLS does not check `reports.*`; data access is governed by the existing delegate-existence policies.

---

## Data source (the only new logic)

`fetchDelegatedReportOrders(supabase, filters)` in the reports feature infrastructure, mirroring `fetchAssignedOrders`:

1. `auth.getUser()`; read `seller_admins` rows where `admin_user_id = user.id` → set of `(seller_id, product_id)` pairs (delegated products per seller).
2. Query `orders` for those `seller_id`s via client Supabase (RLS `orders_delegate_read` authorizes), selecting the same columns the owner report uses, including `order_items(... , products(name_en))`.
3. **Scope to delegated items:** keep only `order_items` whose `product_id` is delegated for that order's seller; drop orders left with no items.
4. Resolve buyer display names + receipt signed URLs client-side (same helpers assigned-orders uses).
5. Map into the identical `SellerReportOrder` shape and apply the same filters (date / status / amount / currency) used by the owner report.

Multiple delegating sellers combine into one list (same as the owner's rows appear combined). No attribution column — reuse the table unchanged.

Owner path is untouched: `/reports` keeps using `/api/seller/reports/orders`. The delegate path uses client Supabase + RLS, exactly like `/assigned`.

---

## UI wiring

- **Route:** `apps/payments/src/app/[locale]/delegated-reports/page.tsx` → renders a thin `DelegatedReportsPage`.
- **Page:** `DelegatedReportsPage` composes the **same** child components as `SellerReportsPage` (`SellerReportFiltersBar`, `SellerReportTable`, `exportSellerOrdersToExcel`) via a new `useDelegatedReports` hook (mirrors `useSellerReports`, calls `fetchDelegatedReportOrders`). Page gated on `reports.read` via `useCurrentUserPermissions().hasPermission(["reports.read"])` + `AccessDeniedState` (same pattern as `AssignedOrdersPage`). Export button renders only when `hasPermission(["reports.export"])`.
- **Nav:** add a `delegatedReports` item to the existing `delegate` section in `PaymentsSidebarNav.tsx` → `href: "/delegated-reports"`, `required: ["reports.read"]`, `mode: "any"`. Rename the `delegate` section label from "Assigned" to "Delegated" so the SELLER-vs-DELEGATE split reads clearly.
- **i18n:** add `sidebar.delegatedReports` ("Delegated Reports") and any page title/subtitle keys to `en.json` + `es.json` (both payments locale files, in sync).

---

## Reuse summary

| Reused unchanged                                                    | New                                              |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| `SellerReportTable`, `SellerReportFiltersBar`                       | `DelegatedReportsPage` (thin shell)              |
| `exportSellerOrdersToExcel`, `downloadExcel`, `buildExportFilename` | `useDelegatedReports` hook                       |
| `SellerReportOrder` / filter domain types                           | `fetchDelegatedReportOrders`                     |
| `orders_delegate_read` + receipt RLS                                | nav item + 2 permission keys + catalog migration |
| `AccessDeniedState`, `useCurrentUserPermissions`                    | i18n keys                                        |

---

## Test plan (TDD)

Write failing Vitest tests first, then implement.

**Unit (Vitest):**

- `PaymentsSidebarNav`: shows `delegatedReports` iff `grantedKeys` includes `reports.read`; hidden otherwise. (extend existing sidebar test)
- `fetchDelegatedReportOrders`: given `seller_admins` across two sellers, returns only delegated products' line items; drops orders with no delegated items; applies filters; empty when no delegations. (mock Supabase client)
- `DelegatedReportsPage`: renders `AccessDeniedState` without `reports.read`; export button hidden without `reports.export`, visible with it; loading/error/empty states.
- Export reuse: assert `exportSellerOrdersToExcel` output over delegated orders matches the seller format (no shape change).

**E2E (Playwright, `apps/payments/e2e/delegated-reports.spec.ts`)**, mirroring `seller-reports.spec.ts` + `apps/auth/e2e/delegated-admin-flow.spec.ts`:

- Delegate with `reports.read` sees the Delegated Reports menu, opens the page, sees rows for the delegated product only (not the seller's other products).
- Delegate with `reports.export` downloads a `.xls`; assert the download event/filename.
- Delegate without the permissions: no menu item, page shows access denied.
- Selectors: `tid()` + ARIA only; no Tailwind-class or translation-text assertions (per e2e-selectors rule).

---

## Rollout / checks

- New migration applies via the standard flow (add to `supabase/migrations/`).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then E2E.
- i18n keys synchronized across payments `en.json`/`es.json` (`pnpm lint:env` unaffected; these are message files).

---

## Revision 2026-07-07 — Fully product-scoped (supersedes "reuse the exact owner report")

Live E2E against real RLS revealed the original "reuse the owner report verbatim"
design leaked data about non-delegated products, and that the delegate could not
even read line items. Two changes were made, and security was chosen over reuse
where they conflicted:

1. **New RLS policy `order_items_delegate_read`** (`supabase/migrations/20260706010000_*`):
   the existing `order_items_read` only grants the order's buyer or seller — a delegate
   is neither, so the report rendered empty. The new policy is **product-scoped**
   (`sa.product_id = order_items.product_id`): a delegate reads only the line items for
   products delegated to them. `orders_delegate_read` stays seller-level because the
   approve/decline flow shares it and needs whole-order visibility; a single order row
   cannot be RLS-scoped per product.

2. **The report is product-scoped end-to-end, not "the same as the owner's".** The
   delegate no longer sees the order-level `total`, the buyer's whole-order `receipt_url`,
   or `transfer_number` (all of which span non-delegated products). Instead:
   - A dedicated `DelegatedReportOrder` domain type with **no** `receipt_url`/`transfer_number`
     fields and an explicit `delegated_subtotal` (Σ of the delegate's line items).
   - `fetchDelegatedReportOrders` computes `delegated_subtotal`, resolves no receipt, and
     applies amount filters app-side against the subtotal.
   - Dedicated `DelegatedReportTable` + `exportDelegatedOrdersToExcel` (filename
     `delegated-report-*.xls`) that never render/emit receipt or transfer columns. The
     owner's `SellerReportTable`/`exportSellerOrdersToExcel`/`SellerReportsPage` remain
     byte-for-byte unchanged.
   - Buyer name/email is intentionally kept (legitimately the delegate's product buyer).

   Net: item rows are product-scoped by RLS **and** app code; aggregates are recomputed
   from delegated items only; whole-order payment artifacts (receipt, transfer, total)
   are never exposed to a delegate. Verified by unit tests (subtotal = 50000 for an order
   whose real total is 80000) and a live headed E2E (delegated row shown, non-delegated
   row on the same order absent, no transfer/receipt).
