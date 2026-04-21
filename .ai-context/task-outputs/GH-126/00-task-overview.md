# Task Overview: GH-126

## Issue Details

| Field         | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| **Issue**     | #126                                                         |
| **Title**     | feat(admin): Sales Report page with filters and Excel export |
| **Type**      | feat                                                         |
| **Labels**    | enhancement, feature                                         |
| **Assignee**  | —                                                            |
| **Milestone** | —                                                            |
| **Created**   | 2026-04-21                                                   |

## Description

Create a dedicated **Sales Report** section in the Admin app that displays all orders/sales attempts across all states, with rich filtering, and a full Excel export that includes receipt images. This feature gets its own permission (`admin.reports`) and the admin template + grant script are updated accordingly.

## Acceptance Criteria

### 1. New Permission: `admin.reports`

- [ ] Add `admin.reports` to the permissions migration (new migration file)
- [ ] Add it to `PERMISSION_GROUPS` in `apps/admin/src/features/users/domain/constants.ts`
- [ ] Add it to the `admin` role template in `PERMISSION_TEMPLATES`
- [ ] Update `scripts/grant-user-role.mjs` so the `admin` role includes `admin.reports`

### 2. New Admin Menu Item: "Ventas" / "Sales Report"

- [ ] Add entry to `AdminSidebar.tsx`
- [ ] Route: `/admin/reports`
- [ ] Required permission: `admin.reports`
- [ ] Icon: `BarChart2` or `TrendingUp` from lucide-react
- [ ] i18n keys added to `en.json` and `es.json`

### 3. Sales Report Page — Filters (server-side)

- [ ] Date range (from/to)
- [ ] Status (multi-select: all OrderStatus values)
- [ ] Seller (select/search)
- [ ] Buyer (text search by email or name)
- [ ] Product (select/search)
- [ ] Currency (select)
- [ ] Amount range (min/max)
- [ ] Filter state in URL via nuqs
- [ ] Collapsible filter panel + "Clear filters" button
- [ ] Pagination (server-side)
- [ ] Results table: Order ID, Buyer, Seller, Status badge, Products, Total, Currency, Date, Receipt indicator

### 4. Backend API Route

- [ ] `apps/admin/src/app/api/admin/reports/orders/route.ts`
- [ ] Requires `admin.reports` permission (server-side check)
- [ ] Accepts all filter params as query string
- [ ] Returns paginated list with joined profiles, items, products, receipt URL
- [ ] `?export=true` returns full unpaginated dataset for Excel

### 5. Excel Export (XLS format, XML-based like existing export)

- [ ] "Export to Excel" button respecting active filters
- [ ] `apps/admin/src/features/reports/application/utils/exportOrdersToExcel.ts`
- [ ] Sheet 1 — Orders (Order ID, Checkout Session, Date, Status, Buyer Email, Buyer Name, Buyer Info, Seller Name, Transfer Number, Seller Note, Total, Currency, Expires At)
- [ ] Sheet 2 — Order Items (Order ID, Product ID, Product Name, Quantity, Unit Price, Currency, Metadata)
- [ ] Sheet 3 — Receipts (Order ID, Buyer Email, Storage Path, File Name, MIME Type, File Size, Receipt File base64)
- [ ] File name: `sales_report_YYYYMMDD_HHMMSS.xls`

### 6. Clean Architecture Feature Folder

- [ ] `apps/admin/src/features/reports/domain/types.ts`
- [ ] `apps/admin/src/features/reports/domain/constants.ts`
- [ ] `apps/admin/src/features/reports/domain/searchParams.ts`
- [ ] `apps/admin/src/features/reports/application/hooks/useReportOrders.ts`
- [ ] `apps/admin/src/features/reports/application/utils/exportOrdersToExcel.ts`
- [ ] `apps/admin/src/features/reports/infrastructure/reportsApi.ts`
- [ ] `apps/admin/src/features/reports/presentation/pages/ReportsPage.tsx`
- [ ] `apps/admin/src/features/reports/presentation/components/ReportFilters.tsx`
- [ ] `apps/admin/src/features/reports/presentation/components/ReportTable.tsx`
- [ ] `apps/admin/src/features/reports/presentation/components/ExportButton.tsx`

### 7. i18n

- [ ] All strings under `reports` namespace in `en.json` and `es.json`

### 8. Tests

- [ ] Unit tests for `exportOrdersToExcel`
- [ ] Unit tests for `useReportOrders`
- [ ] Unit tests for filter searchParams

## Technical Notes

- **Existing Excel util**: `apps/admin/src/features/users/application/utils/exportCsv.ts` — reference for XML-based XLS format
- **Order statuses**: defined in `packages/api/src/supabase/types.ts` as `OrderStatus`
- **Permission system**: `user_permissions` table + `resource_permissions` — new migration needed
- **Sidebar**: dynamic filtering by permission — add item with `required: ["admin.reports"]`
- **grant-user-role.mjs**: add `admin.reports` to `ROLE_TEMPLATES.admin`
- Receipt images: Supabase Storage — signed URLs for table, base64 for export only

## Dependencies

- [ ] Supabase migration for new permission
- Existing: `exportCsv.ts`, `AdminSidebar.tsx`, `user_permissions` table

## Missing Information

- [ ] Confirmar si usar SheetJS (xlsx) o mantener el formato XML-based como en `exportCsv.ts`
