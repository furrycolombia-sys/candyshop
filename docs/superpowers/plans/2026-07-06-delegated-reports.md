# Delegated Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a delegate view and export a sales report over only the products delegated to them, reusing the seller's existing report table and Excel export unchanged.

**Architecture:** Mirror the existing `seller_admins` delegation model (the assigned-orders flow). Add two delegatable permission keys (`reports.read`, `reports.export`), a client-Supabase fetch that reads delegated sellers' orders through the existing `orders_delegate_read` RLS and keeps only delegated products' line items, and a thin payments page + nav entry under the DELEGATE sidebar section. No new report/export UI, no new RLS.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, TanStack Query, nuqs, Supabase (client SDK + RLS), Vitest + Testing Library, Playwright, next-intl.

## Global Constraints

- Package manager is **pnpm**; run all commands from repo root `Z:\Github\candystore`.
- **Never commit** without explicit user permission (repo `commit-policy` / `git-safety`). The `- [ ] Commit` steps below are gated on the user asking; if they have not, skip the commit step and continue.
- **Reuse, do not rebuild:** no new report columns, no "Seller" column, no changes to `apps/payments/src/features/reports/presentation/components/*`, no changes to the owner `/reports` page or `exportSellerOrdersToExcel.ts`. The only difference from the owner report is the data source.
- **Permission keys (exact):** `reports.read` (see menu + page), `reports.export` (see export button). `reports.export` depends_on `reports.read`; `reports.read` depends_on `orders.read`.
- **i18n:** every new key must be added to BOTH `en.json` and `es.json` for the app it belongs to, kept in sync.
- **E2E selectors:** `tid()` / ARIA / data attributes only — never Tailwind classes, never `toContainText`/`toHaveText` on translated copy (repo `e2e-selectors` rule).
- **Absolute imports** for cross-layer references (`@/...`, `ui`, `shared`, `auth/client`); same-directory relative allowed.
- Quality gates before finishing: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

---

### Task 1: Permission catalog migration

Register the two new keys in the Supabase `permissions` + `resource_permissions` catalog so they appear in the admin permission editor and are recognized platform-wide. Mirrors `supabase/migrations/20260421000000_admin_reports_permission.sql`.

**Files:**

- Create: `supabase/migrations/20260706000000_delegate_reports_permissions.sql`

**Interfaces:**

- Produces: catalog rows for keys `reports.read` and `reports.export` (referenced by later tasks as delegatable keys).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260706000000_delegate_reports_permissions.sql`:

```sql
-- Add granular permissions for delegated sales reports (payments app).
-- reports.read  -> a delegate can view the Delegated Reports page
-- reports.export -> a delegate can export the .xls from that page

insert into public.permissions (
  key, name_en, name_es, description_en, description_es, depends_on
)
select
  'reports.read',
  'View Delegated Reports',
  'Ver Reportes Delegados',
  'View the sales report for delegated products',
  'Ver el reporte de ventas de los productos delegados',
  'orders.read'
where not exists (
  select 1 from public.permissions where key = 'reports.read'
);

insert into public.permissions (
  key, name_en, name_es, description_en, description_es, depends_on
)
select
  'reports.export',
  'Export Delegated Reports',
  'Exportar Reportes Delegados',
  'Export the delegated sales report to Excel',
  'Exportar el reporte de ventas delegado a Excel',
  'reports.read'
where not exists (
  select 1 from public.permissions where key = 'reports.export'
);

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in ('reports.read', 'reports.export')
and not exists (
  select 1 from public.resource_permissions rp
  where rp.permission_id = p.id
    and rp.resource_type = 'global'
    and rp.resource_id is null
);
```

- [ ] **Step 2: Verify the migration applies cleanly**

Run: `pnpm supabase:reset`
Expected: reset completes without error and the new migration is listed among applied migrations.

- [ ] **Step 3: Verify the keys exist**

Run (via Supabase SQL editor or `pnpm supabase` psql):

```sql
select key, depends_on from public.permissions where key in ('reports.read','reports.export');
```

Expected: two rows — `reports.read | orders.read` and `reports.export | reports.read`.

- [ ] **Step 4: Commit** (only if the user has authorized committing)

```bash
git add supabase/migrations/20260706000000_delegate_reports_permissions.sql
git commit -m "feat(db): add reports.read/reports.export delegate permissions [GH-000]"
```

---

### Task 2: Make `reports.read`/`reports.export` delegatable in studio + admin catalog

Extend the delegate permission set so a seller can grant these when delegating a product, and add them to the admin permission-group editor. The studio `AddDelegateForm` renders one checkbox per `DELEGATE_PERMISSIONS` entry and derives its label from `permissions.<key with dots as underscores>`, so adding the constant + i18n labels wires the UI automatically.

**Files:**

- Modify: `apps/studio/src/features/seller-admins/domain/types.ts` (extend `DelegatePermission` union)
- Modify: `apps/studio/src/features/seller-admins/domain/constants.ts` (extend `DELEGATE_PERMISSIONS`)
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/en.json` (`sellerAdmins.permissions.*`)
- Modify: `apps/studio/src/shared/infrastructure/i18n/messages/es.json` (`sellerAdmins.permissions.*`)
- Modify: `apps/admin/src/features/users/domain/constants.ts` (add `reports` group to `PERMISSION_GROUPS`)
- Test: `apps/studio/src/features/seller-admins/domain/validation.test.ts` (create)

**Interfaces:**

- Consumes: keys `reports.read`, `reports.export` from Task 1.
- Produces: `DelegatePermission` now includes `"reports.read" | "reports.export"`; `DELEGATE_PERMISSIONS` array contains all four keys.

- [ ] **Step 1: Write the failing validation test**

Create `apps/studio/src/features/seller-admins/domain/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

import { validateDelegateInput } from "./validation";

describe("validateDelegateInput", () => {
  it("accepts reports.read and reports.export as valid delegate permissions", () => {
    expect(() =>
      validateDelegateInput("seller-1", "admin-1", [
        "reports.read",
        "reports.export",
      ]),
    ).not.toThrow();
  });

  it("still rejects an unknown permission", () => {
    expect(() =>
      // @ts-expect-error deliberately invalid permission value
      validateDelegateInput("seller-1", "admin-1", ["reports.delete"]),
    ).toThrow(/Invalid permission/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter studio -- validation.test.ts`
Expected: FAIL — `reports.read` is not in `DELEGATE_PERMISSIONS`, so the first case throws "Invalid permission".

- [ ] **Step 3: Extend the `DelegatePermission` union**

In `apps/studio/src/features/seller-admins/domain/types.ts`, replace the union line:

```typescript
/** Permission keys that can be delegated to admin users */
export type DelegatePermission =
  | "orders.approve"
  | "orders.request_proof"
  | "reports.read"
  | "reports.export";
```

- [ ] **Step 4: Extend `DELEGATE_PERMISSIONS`**

In `apps/studio/src/features/seller-admins/domain/constants.ts`, replace the array:

```typescript
/** All valid delegate permission values */
export const DELEGATE_PERMISSIONS: DelegatePermission[] = [
  "orders.approve",
  "orders.request_proof",
  "reports.read",
  "reports.export",
];
```

- [ ] **Step 5: Add studio i18n labels**

In `apps/studio/src/shared/infrastructure/i18n/messages/en.json`, extend the `sellerAdmins.permissions` object:

```json
"permissions": {
  "orders_approve": "Approve Orders",
  "orders_request_proof": "Request Proof",
  "reports_read": "View Reports",
  "reports_export": "Export Reports"
}
```

In `apps/studio/src/shared/infrastructure/i18n/messages/es.json`, extend the same object:

```json
"permissions": {
  "orders_approve": "Aprobar Órdenes",
  "orders_request_proof": "Solicitar Comprobante",
  "reports_read": "Ver Reportes",
  "reports_export": "Exportar Reportes"
}
```

(Match the existing Spanish keys already present for `orders_approve`/`orders_request_proof`; only add the two new lines.)

- [ ] **Step 6: Add the admin permission group**

In `apps/admin/src/features/users/domain/constants.ts`, add a new group to the `PERMISSION_GROUPS` array (after the `adminReports` group):

```typescript
  {
    key: "reports",
    labelKey: "reports",
    permissions: ["reports.read", "reports.export"],
  },
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test --filter studio -- validation.test.ts`
Expected: PASS (both cases).

- [ ] **Step 8: Typecheck studio + admin**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 9: Commit** (only if the user has authorized committing)

```bash
git add apps/studio/src/features/seller-admins apps/studio/src/shared/infrastructure/i18n apps/admin/src/features/users/domain/constants.ts
git commit -m "feat(delegates): make reports.read/reports.export delegatable [GH-000]"
```

---

### Task 3: `fetchDelegatedReportOrders` — the delegated data source

The only new logic. Reads the caller's `seller_admins` delegations that grant `reports.read`, pulls those sellers' orders via the existing RLS, keeps only delegated products' line items, and maps into the identical `SellerReportOrder` shape. Mirrors `fetchAssignedOrders`.

**Files:**

- Create: `apps/payments/src/features/reports/infrastructure/delegatedReportsApi.ts`
- Test: `apps/payments/src/features/reports/infrastructure/delegatedReportsApi.test.ts`

**Interfaces:**

- Consumes: `SellerReportFilters`, `SellerReportOrder`, `SellerReportOrdersResponse` from `@/features/reports/domain/types`; `SupabaseClient` from `@/shared/domain/types`; `getReceiptUrl` from `@/shared/infrastructure/receiptStorage`.
- Produces: `fetchDelegatedReportOrders(supabase: SupabaseClient, filters: SellerReportFilters): Promise<SellerReportOrdersResponse>`.

- [ ] **Step 1: Write the failing test**

Create `apps/payments/src/features/reports/infrastructure/delegatedReportsApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { SellerReportFilters } from "@/features/reports/domain/types";

vi.mock("@/shared/infrastructure/receiptStorage", () => ({
  getReceiptUrl: vi.fn(async () => "https://signed/receipt.png"),
}));

import { fetchDelegatedReportOrders } from "./delegatedReportsApi";

const NO_FILTERS: SellerReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

// Minimal chainable Supabase stub. Each table returns a canned dataset.
function makeSupabase(datasets: {
  seller_admins: unknown[];
  orders: unknown[];
  user_profiles: unknown[];
}) {
  const auth = {
    getUser: vi.fn(async () => ({ data: { user: { id: "delegate-1" } } })),
  };
  function from(table: keyof typeof datasets) {
    const rows = datasets[table];
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    };
    return builder;
  }
  return { auth, from: (t: keyof typeof datasets) => from(t) } as never;
}

describe("fetchDelegatedReportOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty result when the user has no delegations granting reports.read", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["orders.approve"] },
      ],
      orders: [],
      user_profiles: [],
    });
    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);
    expect(res.orders).toEqual([]);
    expect(res.total).toBe(0);
  });

  it("keeps only line items for delegated products and drops orders with none", async () => {
    const supabase = makeSupabase({
      seller_admins: [
        { seller_id: "s1", product_id: "p1", permissions: ["reports.read"] },
      ],
      orders: [
        {
          id: "o1",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-01T00:00:00Z",
          payment_status: "approved",
          total: 30,
          currency: "USD",
          transfer_number: "T1",
          receipt_url: "o1/receipt.png",
          order_items: [
            {
              id: "i1",
              product_id: "p1",
              quantity: 1,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Delegated" },
            },
            {
              id: "i2",
              product_id: "p2",
              quantity: 2,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Other" },
            },
          ],
        },
        {
          id: "o2",
          seller_id: "s1",
          user_id: "b1",
          created_at: "2026-01-02T00:00:00Z",
          payment_status: "approved",
          total: 20,
          currency: "USD",
          transfer_number: null,
          receipt_url: null,
          order_items: [
            {
              id: "i3",
              product_id: "p2",
              quantity: 2,
              unit_price: 10,
              currency: "USD",
              products: { name_en: "Other" },
            },
          ],
        },
      ],
      user_profiles: [
        { id: "b1", email: "buyer@example.com", display_name: "Buyer One" },
      ],
    });

    const res = await fetchDelegatedReportOrders(supabase, NO_FILTERS);

    expect(res.total).toBe(1);
    expect(res.orders).toHaveLength(1);
    expect(res.orders[0].id).toBe("o1");
    expect(res.orders[0].items).toHaveLength(1);
    expect(res.orders[0].items[0].product_id).toBe("p1");
    expect(res.orders[0].items[0].product_name).toBe("Delegated");
    expect(res.orders[0].buyer_email).toBe("buyer@example.com");
    expect(res.orders[0].receipt_url).toBe("https://signed/receipt.png");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter payments -- delegatedReportsApi.test.ts`
Expected: FAIL — module `./delegatedReportsApi` does not exist.

- [ ] **Step 3: Implement `fetchDelegatedReportOrders`**

Create `apps/payments/src/features/reports/infrastructure/delegatedReportsApi.ts`:

```typescript
/* eslint-disable i18next/no-literal-string -- infrastructure: Supabase identifiers, not user-facing text */
import type {
  SellerReportFilters,
  SellerReportOrder,
  SellerReportOrdersResponse,
} from "@/features/reports/domain/types";
import type { SupabaseClient } from "@/shared/domain/types";
import { getReceiptUrl } from "@/shared/infrastructure/receiptStorage";

const REPORTS_READ = "reports.read";

const ORDER_SELECT =
  "id,seller_id,user_id,created_at,payment_status,total,currency,transfer_number,receipt_url," +
  "order_items(id,product_id,quantity,unit_price,currency,products(name_en))";

const END_OF_DAY = "T23:59:59";

type DelegationRow = {
  seller_id: string;
  product_id: string;
  permissions: string[] | null;
};

type ItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name_en: string } | null;
};

type OrderRow = {
  id: string;
  seller_id: string;
  user_id: string;
  created_at: string;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  order_items: ItemRow[];
};

type ProfileRow = { id: string; email: string; display_name: string | null };

/**
 * Map (seller_id -> set of delegated product_ids) for delegations that grant
 * reports.read. Only these products may appear in the delegate's report.
 */
function buildDelegatedProductMap(
  rows: DelegationRow[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!(row.permissions ?? []).includes(REPORTS_READ)) continue;
    const set = map.get(row.seller_id) ?? new Set<string>();
    set.add(row.product_id);
    map.set(row.seller_id, set);
  }
  return map;
}

function mapItem(item: ItemRow): SellerReportOrder["items"][number] {
  return {
    id: item.id,
    product_id: item.product_id,
    product_name: item.products?.name_en ?? item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency: item.currency,
  };
}

async function mapOrder(
  supabase: SupabaseClient,
  row: OrderRow,
  delegatedProductIds: Set<string>,
  profileMap: Map<string, ProfileRow>,
): Promise<SellerReportOrder | null> {
  const items = row.order_items
    .filter((item) => delegatedProductIds.has(item.product_id))
    .map(mapItem);
  if (items.length === 0) return null;

  let signedReceiptUrl: string | null = null;
  if (row.receipt_url) {
    try {
      signedReceiptUrl = await getReceiptUrl(supabase, row.receipt_url);
    } catch {
      signedReceiptUrl = null;
    }
  }

  const profile = profileMap.get(row.user_id);
  return {
    id: row.id,
    created_at: row.created_at,
    payment_status: row.payment_status as SellerReportOrder["payment_status"],
    total: row.total,
    currency: row.currency,
    transfer_number: row.transfer_number,
    receipt_url: signedReceiptUrl,
    buyer_id: row.user_id,
    buyer_email: profile?.email ?? "",
    buyer_display_name: profile?.display_name ?? null,
    items,
  };
}

export async function fetchDelegatedReportOrders(
  supabase: SupabaseClient,
  filters: SellerReportFilters,
): Promise<SellerReportOrdersResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { orders: [], total: 0 };

  const { data: delegations } = await supabase
    .from("seller_admins")
    .select("seller_id, product_id, permissions")
    .eq("admin_user_id", user.id);

  const productMap = buildDelegatedProductMap(
    (delegations ?? []) as DelegationRow[],
  );
  if (productMap.size === 0) return { orders: [], total: 0 };

  const sellerIds = [...productMap.keys()];

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("seller_id", sellerIds)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}${END_OF_DAY}`);
  if (filters.status) query = query.eq("payment_status", filters.status);
  if (filters.buyerId) query = query.eq("user_id", filters.buyerId);
  if (filters.currency)
    query = query.eq("currency", filters.currency.toUpperCase());
  if (filters.amountMin != null) query = query.gte("total", filters.amountMin);
  if (filters.amountMax != null) query = query.lte("total", filters.amountMax);

  const { data: orderData } = await query;
  const rows = (orderData ?? []) as OrderRow[];
  if (rows.length === 0) return { orders: [], total: 0 };

  const buyerIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, display_name")
    .in("id", buyerIds);

  const profileMap = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p);

  const mapped = await Promise.all(
    rows.map((row) =>
      mapOrder(
        supabase,
        row,
        productMap.get(row.seller_id) ?? new Set<string>(),
        profileMap,
      ),
    ),
  );
  const orders = mapped.filter((o): o is SellerReportOrder => o !== null);

  return { orders, total: orders.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --filter payments -- delegatedReportsApi.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit** (only if the user has authorized committing)

```bash
git add apps/payments/src/features/reports/infrastructure/delegatedReportsApi.ts apps/payments/src/features/reports/infrastructure/delegatedReportsApi.test.ts
git commit -m "feat(reports): add delegated report data source [GH-000]"
```

---

### Task 4: `useDelegatedReports` hook

Mirrors `useSellerReports` but fetches through `fetchDelegatedReportOrders` with the client Supabase instance. Same nuqs filter state, same return shape, so the page can reuse the seller report children.

**Files:**

- Create: `apps/payments/src/features/reports/application/hooks/useDelegatedReports.ts`
- Test: `apps/payments/src/features/reports/application/hooks/useDelegatedReports.test.tsx`

**Interfaces:**

- Consumes: `fetchDelegatedReportOrders` (Task 3); `useSupabase` from `shared`; `sellerReportsSearchParams` and `SELLER_REPORTS_QUERY_KEY`-style key.
- Produces: `useDelegatedReports(): { orders, total, isLoading, isError, filters, setFilters }` (same shape as `useSellerReports`).

- [ ] **Step 1: Write the failing test**

Create `apps/payments/src/features/reports/application/hooks/useDelegatedReports.test.tsx`:

```typescript
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
// eslint-disable-next-line import/order -- vi.mock hoisting requires these imports first
import { useQueryStates } from "nuqs";
// eslint-disable-next-line import/order -- vi.mock hoisting requires these imports first
import { useQuery } from "@tanstack/react-query";

vi.mock("nuqs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("nuqs")>();
  return { ...actual, useQueryStates: vi.fn() };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock("shared", () => ({ useSupabase: () => ({}) }));

vi.mock("@/features/reports/infrastructure/delegatedReportsApi", () => ({
  fetchDelegatedReportOrders: vi.fn(),
}));

import { useDelegatedReports } from "./useDelegatedReports";

const mockSetParams = vi.fn();
const emptyParams = {
  dateFrom: null,
  dateTo: null,
  status: null,
  buyerId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

describe("useDelegatedReports", () => {
  beforeEach(() => {
    vi.mocked(useQueryStates).mockReturnValue([
      emptyParams,
      mockSetParams,
    ] as ReturnType<typeof useQueryStates>);
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);
  });

  it("returns empty orders and zero total when no data", () => {
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.orders).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it("returns orders and total from query data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { orders: [{ id: "o1" }], total: 1 },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.total).toBe(1);
    expect(result.current.orders).toHaveLength(1);
  });

  it("exposes setFilters from nuqs", () => {
    const { result } = renderHook(() => useDelegatedReports());
    expect(result.current.setFilters).toBe(mockSetParams);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter payments -- useDelegatedReports.test.tsx`
Expected: FAIL — module `./useDelegatedReports` does not exist.

- [ ] **Step 3: Implement the hook**

Create `apps/payments/src/features/reports/application/hooks/useDelegatedReports.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useSupabase } from "shared";

import { sellerReportsSearchParams } from "@/features/reports/domain/searchParams";
import type { SellerReportFilters } from "@/features/reports/domain/types";
import { fetchDelegatedReportOrders } from "@/features/reports/infrastructure/delegatedReportsApi";

const DELEGATED_REPORTS_QUERY_KEY = "delegated-reports";
const STALE_TIME_MS = 30_000;

export function useDelegatedReports() {
  const supabase = useSupabase();
  const [params, setParams] = useQueryStates(sellerReportsSearchParams);

  const filters: SellerReportFilters = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status,
    buyerId: params.buyerId,
    currency: params.currency,
    amountMin: params.amountMin,
    amountMax: params.amountMax,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: [DELEGATED_REPORTS_QUERY_KEY, filters],
    queryFn: () => fetchDelegatedReportOrders(supabase, filters),
    staleTime: STALE_TIME_MS,
  });

  return {
    orders: data?.orders ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    filters,
    setFilters: setParams,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --filter payments -- useDelegatedReports.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit** (only if the user has authorized committing)

```bash
git add apps/payments/src/features/reports/application/hooks/useDelegatedReports.ts apps/payments/src/features/reports/application/hooks/useDelegatedReports.test.tsx
git commit -m "feat(reports): add useDelegatedReports hook [GH-000]"
```

---

### Task 5: `DelegatedReportsPage` + route

Thin page composing the SAME children as `SellerReportsPage` (`SellerReportFiltersBar`, `SellerReportTable`, `exportSellerOrdersToExcel`). Gated on `reports.read` via `useCurrentUserPermissions` + `AccessDeniedState` (same as `AssignedOrdersPage`); export button renders only with `reports.export`.

**Files:**

- Create: `apps/payments/src/features/reports/presentation/pages/DelegatedReportsPage.tsx`
- Create: `apps/payments/src/features/reports/presentation/pages/DelegatedReportsPage.test.tsx`
- Modify: `apps/payments/src/features/reports/index.ts` (export `DelegatedReportsPage`)
- Create: `apps/payments/src/app/[locale]/delegated-reports/page.tsx`
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/en.json` (`delegatedReports.*`)
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/es.json` (`delegatedReports.*`)

**Interfaces:**

- Consumes: `useDelegatedReports` (Task 4); `useCurrentUserPermissions` from `auth/client`; `SellerReportFiltersBar`, `SellerReportTable`, `exportSellerOrdersToExcel`, `downloadExcel`, `buildExportFilename` from the reports feature; `AccessDeniedState` from `@/shared/presentation/components/AccessDeniedState`.
- Produces: `DelegatedReportsPage` React component.

- [ ] **Step 1: Write the failing test**

Create `apps/payments/src/features/reports/presentation/pages/DelegatedReportsPage.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn();

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({ tid: (id: string) => ({ "data-testid": id }) }));

vi.mock("@/features/reports/application/hooks/useDelegatedReports", () => ({
  useDelegatedReports: () => ({
    orders: [{ id: "o1", items: [], currency: "USD" }],
    total: 1,
    isLoading: false,
    isError: false,
    filters: {},
    setFilters: vi.fn(),
  }),
}));

vi.mock("@/features/reports/presentation/components/SellerReportFiltersBar", () => ({
  SellerReportFiltersBar: () => <div data-testid="filters-bar" />,
}));

vi.mock("@/features/reports/presentation/components/SellerReportTable", () => ({
  SellerReportTable: () => <div data-testid="report-table" />,
}));

vi.mock("@/shared/presentation/components/AccessDeniedState", () => ({
  AccessDeniedState: () => <div data-testid="access-denied" />,
}));

import { DelegatedReportsPage } from "./DelegatedReportsPage";

describe("DelegatedReportsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows access denied without reports.read", () => {
    mockHasPermission.mockReturnValue(false);
    render(<DelegatedReportsPage />);
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
  });

  it("renders the report and hides export without reports.export", () => {
    mockHasPermission.mockImplementation((keys: string[]) =>
      keys.includes("reports.read"),
    );
    render(<DelegatedReportsPage />);
    expect(screen.getByTestId("report-table")).toBeInTheDocument();
    expect(
      screen.queryByTestId("delegated-reports-export-button"),
    ).not.toBeInTheDocument();
  });

  it("shows export button with reports.export", () => {
    mockHasPermission.mockReturnValue(true);
    render(<DelegatedReportsPage />);
    expect(
      screen.getByTestId("delegated-reports-export-button"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter payments -- DelegatedReportsPage.test.tsx`
Expected: FAIL — module `./DelegatedReportsPage` does not exist.

- [ ] **Step 3: Implement the page**

Create `apps/payments/src/features/reports/presentation/pages/DelegatedReportsPage.tsx`:

```typescript
"use client";

import { useCurrentUserPermissions } from "auth/client";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { tid } from "shared";

import { useDelegatedReports } from "@/features/reports/application/hooks/useDelegatedReports";
import {
  buildExportFilename,
  downloadExcel,
  exportSellerOrdersToExcel,
} from "@/features/reports/application/utils/exportSellerOrdersToExcel";
import { SellerReportFiltersBar } from "@/features/reports/presentation/components/SellerReportFiltersBar";
import { SellerReportTable } from "@/features/reports/presentation/components/SellerReportTable";
import { AccessDeniedState } from "@/shared/presentation/components/AccessDeniedState";

const READ_PERMISSION = ["reports.read"] as const;
const EXPORT_PERMISSION = ["reports.export"] as const;

export function DelegatedReportsPage() {
  const t = useTranslations("delegatedReports");
  const tc = useTranslations("common");
  const { hasPermission } = useCurrentUserPermissions();
  const [isExporting, setIsExporting] = useState(false);
  const { orders, total, isLoading, isError, filters, setFilters } =
    useDelegatedReports();

  const canExport = hasPermission([...EXPORT_PERMISSION]);

  const currencies = useMemo(
    () => [...new Set(orders.map((o) => o.currency).filter(Boolean))].sort(),
    [orders],
  );

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const content = exportSellerOrdersToExcel(orders, filters);
      downloadExcel(content, buildExportFilename());
    } finally {
      setIsExporting(false);
    }
  }, [filters, isExporting, orders]);

  if (!hasPermission([...READ_PERMISSION])) {
    return (
      <AccessDeniedState
        title={tc("accessDenied")}
        hint={tc("accessDeniedHint")}
      />
    );
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          {t("loading")}
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-destructive">
          {t("error")}
        </div>
      );
    }
    return (
      <>
        <p
          className="text-xs text-muted-foreground"
          {...tid("delegated-reports-total-count")}
        >
          {t("totalOrders", { count: total })}
        </p>
        <SellerReportTable orders={orders} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6" {...tid("delegated-reports-page")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={handleExport}
            disabled={orders.length === 0 || isExporting}
            className="flex items-center gap-2 rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            {...tid("delegated-reports-export-button")}
          >
            <Download className="size-4" />
            {isExporting ? t("exporting") : t("exportExcel")}
          </button>
        )}
      </div>

      <SellerReportFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        currencies={currencies}
      />

      {renderContent()}
    </div>
  );
}
```

- [ ] **Step 4: Export the page from the feature barrel**

In `apps/payments/src/features/reports/index.ts`, add:

```typescript
export { DelegatedReportsPage } from "./presentation/pages/DelegatedReportsPage";
```

- [ ] **Step 5: Add the route**

Create `apps/payments/src/app/[locale]/delegated-reports/page.tsx`:

```typescript
import { setRequestLocale } from "next-intl/server";

import { DelegatedReportsPage } from "@/features/reports";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DelegatedReportsPage />;
}
```

- [ ] **Step 6: Add page i18n keys**

In `apps/payments/src/shared/infrastructure/i18n/messages/en.json`, add a top-level `delegatedReports` object (mirror the existing `sellerReports` keys — copy its shape; adjust title/subtitle copy):

```json
"delegatedReports": {
  "title": "Delegated Reports",
  "subtitle": "Sales for products delegated to you",
  "loading": "Loading…",
  "error": "Failed to load report",
  "totalOrders": "{count} orders",
  "exportExcel": "Export Excel",
  "exporting": "Exporting…"
}
```

In `apps/payments/src/shared/infrastructure/i18n/messages/es.json`, add the Spanish equivalent:

```json
"delegatedReports": {
  "title": "Reportes Delegados",
  "subtitle": "Ventas de los productos delegados a ti",
  "loading": "Cargando…",
  "error": "No se pudo cargar el reporte",
  "totalOrders": "{count} órdenes",
  "exportExcel": "Exportar Excel",
  "exporting": "Exportando…"
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test --filter payments -- DelegatedReportsPage.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 8: Commit** (only if the user has authorized committing)

```bash
git add apps/payments/src/features/reports apps/payments/src/app/[locale]/delegated-reports apps/payments/src/shared/infrastructure/i18n
git commit -m "feat(reports): add delegated reports page and route [GH-000]"
```

---

### Task 6: Sidebar nav item + DELEGATE section relabel

Add the `delegatedReports` item to the existing `delegate` section, gated on `reports.read` (mode `any`), and relabel the section so SELLER (your stuff) vs DELEGATE (someone else's) reads clearly.

**Files:**

- Modify: `apps/payments/src/shared/presentation/components/PaymentsSidebarNav.tsx`
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/en.json` (`sidebar.delegate`, `sidebar.delegatedReports`)
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/es.json` (same keys)
- Test: `apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx` (extend)

**Interfaces:**

- Consumes: key `reports.read` from Task 1; `matchesPermissions` from `auth/client`.
- Produces: sidebar renders `sidebar-delegatedReports` link when `reports.read` is granted.

- [ ] **Step 1: Write the failing test**

In `apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx`, add `"reports.read"` to `mockGrantedPermissions` and add this test inside the `describe`:

```typescript
  it("renders delegated reports link when reports.read is granted", () => {
    render(<PaymentsSidebar />);
    expect(
      screen.getByTestId("sidebar-delegatedReports"),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --filter payments -- PaymentsSidebar.test.tsx`
Expected: FAIL — no `sidebar-delegatedReports` element yet.

- [ ] **Step 3: Add the nav item**

In `apps/payments/src/shared/presentation/components/PaymentsSidebarNav.tsx`:

First add a permission constant near the other permission tuples (after `ASSIGNED_PERMISSIONS`):

```typescript
const DELEGATED_REPORTS_PERMISSIONS = ["reports.read"] as const;
```

Then add the item to the `delegate` section (after the `assigned` item), and import the icon. Update the icon import line to include `BarChart3` if not already imported (it is), and add:

```typescript
      {
        key: "delegatedReports" as const,
        href: "/delegated-reports",
        icon: BarChart3,
        required: DELEGATED_REPORTS_PERMISSIONS,
        mode: "any" as const,
      },
```

- [ ] **Step 4: Relabel the DELEGATE section + add nav label (i18n)**

In `apps/payments/src/shared/infrastructure/i18n/messages/en.json` `sidebar` object, change `"delegate": "Assigned"` to `"delegate": "Delegated"` and add `"delegatedReports": "Delegated Reports"`.

In `apps/payments/src/shared/infrastructure/i18n/messages/es.json` `sidebar` object, set `"delegate": "Delegado"` and add `"delegatedReports": "Reportes Delegados"`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test --filter payments -- PaymentsSidebar.test.tsx`
Expected: PASS (existing tests + the new one).

- [ ] **Step 6: Commit** (only if the user has authorized committing)

```bash
git add apps/payments/src/shared/presentation/components/PaymentsSidebarNav.tsx apps/payments/src/shared/presentation/components/PaymentsSidebar.test.tsx apps/payments/src/shared/infrastructure/i18n
git commit -m "feat(nav): add delegated reports to DELEGATE section [GH-000]"
```

---

### Task 7: Playwright E2E

End-to-end coverage in the payments app, mirroring `apps/payments/e2e/seller-reports.spec.ts` and `apps/auth/e2e/delegated-admin-flow.spec.ts`. Reuse those files' seeding/login helpers verbatim — do not invent new auth flows.

**Files:**

- Create: `apps/payments/e2e/delegated-reports.spec.ts`

**Interfaces:**

- Consumes: the running payments app and the shared e2e helpers from `apps/auth/e2e/helpers/session` (`createTestUser`, `injectSession`, `adminInsert`, `adminDelete`, `supabaseAdmin`, `SELLER_PERMISSIONS`, `TestUser`) and `apps/auth/e2e/helpers/constants` (`ELEMENT_TIMEOUT_MS`, `MUTATION_WAIT_MS`), plus `resolveE2EAppUrls` from `scripts/app-url-resolver.js` — all used verbatim by `seller-reports.spec.ts`.
- Note: the delegated page reuses `SellerReportTable`, so its rows expose the same `seller-report-row-transfer-*` test-ids and `seller-report-table` container; the export reuses `buildExportFilename` (`my-sales-report-*.xls`).

- [ ] **Step 1: Write the E2E spec**

Create `apps/payments/e2e/delegated-reports.spec.ts`:

```typescript
import path from "node:path";
import { expect, test } from "@playwright/test";

import {
  ELEMENT_TIMEOUT_MS,
  MUTATION_WAIT_MS,
} from "../../auth/e2e/helpers/constants";
import {
  SELLER_PERMISSIONS,
  adminDelete,
  adminInsert,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../auth/e2e/helpers/session";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveE2EAppUrls } = require(
  path.resolve(__dirname, "../../../scripts/app-url-resolver.js"),
);

function getPaymentsBaseUrl(): string {
  const urls = resolveE2EAppUrls() as { payments: string };
  return urls.payments;
}

const DELEGATED_ORDER = {
  total: 50000,
  currency: "COP",
  payment_status: "approved",
  transfer_number: "E2E-DELEGATED-REPORT-DELEGATED",
  receipt_url: null,
};

const OTHER_ORDER = {
  total: 30000,
  currency: "COP",
  payment_status: "approved",
  transfer_number: "E2E-DELEGATED-REPORT-OTHER",
  receipt_url: null,
};

test.describe.serial("Delegated Reports page", () => {
  let sellerUser: TestUser;
  let delegateUser: TestUser;
  let buyerUser: TestUser;
  let delegatedProductId: string;
  let otherProductId: string;
  let delegatedOrderId: string;
  let otherOrderId: string;
  let delegationId: string;

  test.beforeAll(async () => {
    sellerUser = await createTestUser(
      "delegated-reports-seller",
      SELLER_PERMISSIONS,
    );
    delegateUser = await createTestUser("delegated-reports-delegate", []);
    buyerUser = await createTestUser("delegated-reports-buyer", []);

    const delegatedProduct = await adminInsert("products", {
      slug: `e2e-delegated-report-p1-${Date.now()}`,
      name_en: "Delegated Product",
      name_es: "Producto Delegado",
      description_en: "Delegated",
      description_es: "Delegado",
      type: "merch",
      price: 25000,
      currency: "COP",
      max_quantity: 5,
      seller_id: sellerUser.userId,
    });
    delegatedProductId = delegatedProduct.id as string;

    const otherProduct = await adminInsert("products", {
      slug: `e2e-delegated-report-p2-${Date.now()}`,
      name_en: "Other Product",
      name_es: "Otro Producto",
      description_en: "Not delegated",
      description_es: "No delegado",
      type: "merch",
      price: 15000,
      currency: "COP",
      max_quantity: 5,
      seller_id: sellerUser.userId,
    });
    otherProductId = otherProduct.id as string;

    const delegatedOrder = await adminInsert("orders", {
      ...DELEGATED_ORDER,
      user_id: buyerUser.userId,
      seller_id: sellerUser.userId,
    });
    delegatedOrderId = delegatedOrder.id as string;
    await adminInsert("order_items", {
      order_id: delegatedOrderId,
      product_id: delegatedProductId,
      quantity: 2,
      unit_price: 25000,
      currency: "COP",
    });

    const otherOrder = await adminInsert("orders", {
      ...OTHER_ORDER,
      user_id: buyerUser.userId,
      seller_id: sellerUser.userId,
    });
    otherOrderId = otherOrder.id as string;
    await adminInsert("order_items", {
      order_id: otherOrderId,
      product_id: otherProductId,
      quantity: 2,
      unit_price: 15000,
      currency: "COP",
    });

    // Delegate ONLY product P1 to the delegate, granting reports.read + reports.export.
    const delegation = await adminInsert("seller_admins", {
      seller_id: sellerUser.userId,
      admin_user_id: delegateUser.userId,
      product_id: delegatedProductId,
      permissions: ["reports.read", "reports.export"],
    });
    delegationId = delegation.id as string;
  });

  test.afterAll(async () => {
    await adminDelete("seller_admins", `id=eq.${delegationId}`).catch(() => {});
    await adminDelete("order_items", `order_id=eq.${delegatedOrderId}`).catch(
      () => {},
    );
    await adminDelete("order_items", `order_id=eq.${otherOrderId}`).catch(
      () => {},
    );
    await adminDelete("orders", `id=eq.${delegatedOrderId}`).catch(() => {});
    await adminDelete("orders", `id=eq.${otherOrderId}`).catch(() => {});
    await adminDelete("products", `id=eq.${delegatedProductId}`).catch(
      () => {},
    );
    await adminDelete("products", `id=eq.${otherProductId}`).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(buyerUser.userId).catch(() => {});
    await supabaseAdmin.auth.admin
      .deleteUser(delegateUser.userId)
      .catch(() => {});
    await supabaseAdmin.auth.admin
      .deleteUser(sellerUser.userId)
      .catch(() => {});
  });

  test("delegate sees the Delegated Reports menu and page", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(`${getPaymentsBaseUrl()}/en/delegated-reports`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByTestId("sidebar-delegatedReports")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("delegated-reports-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });

  test("shows only delegated product orders, not other products", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/delegated-reports?status=approved`,
      {
        waitUntil: "networkidle",
      },
    );
    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: DELEGATED_ORDER.transfer_number }),
    ).toBeVisible({ timeout: MUTATION_WAIT_MS });

    await expect(
      page
        .locator(`[data-testid^="seller-report-row-transfer-"]`)
        .filter({ hasText: OTHER_ORDER.transfer_number }),
    ).not.toBeVisible();
  });

  test("delegate with reports.export can download the XLS", async ({
    context,
    page,
  }) => {
    await injectSession(context, delegateUser);
    await page.goto(
      `${getPaymentsBaseUrl()}/en/delegated-reports?status=approved`,
      {
        waitUntil: "networkidle",
      },
    );
    await expect(page.getByTestId("seller-report-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const exportButton = page.getByTestId("delegated-reports-export-button");
    await expect(exportButton).toBeEnabled({ timeout: ELEMENT_TIMEOUT_MS });

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xls$/i);
  });

  test("delegate without reports.read sees no menu and no report page", async ({
    context,
    page,
  }) => {
    const noReportDelegate = await createTestUser(
      "delegated-reports-noperm",
      [],
    );
    const noReportDelegation = await adminInsert("seller_admins", {
      seller_id: sellerUser.userId,
      admin_user_id: noReportDelegate.userId,
      product_id: delegatedProductId,
      permissions: ["orders.approve"],
    });
    try {
      await injectSession(context, noReportDelegate);
      await page.goto(`${getPaymentsBaseUrl()}/en/delegated-reports`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(MUTATION_WAIT_MS);
      await expect(page.getByTestId("sidebar-delegatedReports")).toHaveCount(0);
      await expect(page.getByTestId("delegated-reports-page")).toHaveCount(0);
    } finally {
      await adminDelete(
        "seller_admins",
        `id=eq.${noReportDelegation.id}`,
      ).catch(() => {});
      await supabaseAdmin.auth.admin
        .deleteUser(noReportDelegate.userId)
        .catch(() => {});
    }
  });
});
```

- [ ] **Step 2: Run the E2E spec**

Run: `pnpm test:e2e -- delegated-reports.spec.ts` (the same invocation `seller-reports.spec.ts` uses).
Expected: all four tests PASS.

> If the "no report page" assertion needs the page to render an explicit access-denied element instead of a missing container, assert `page.getByTestId("access-denied")` is visible (the `DelegatedReportsPage` renders `AccessDeniedState` — add a `tid("access-denied")` to that shared component if it lacks one, without changing its behavior).

- [ ] **Step 3: Commit** (only if the user has authorized committing)

```bash
git add apps/payments/e2e/delegated-reports.spec.ts
git commit -m "test(e2e): cover delegated reports flow [GH-000]"
```

---

### Task 8: Full quality gate

- [ ] **Step 1: Format + lint + typecheck + unit tests + build**

Run, in order:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all pass. Fix any failures before finishing.

- [ ] **Step 2: Confirm i18n key parity**

Confirm each new key exists in both `en.json` and `es.json` for payments (`delegatedReports.*`, `sidebar.delegatedReports`, `sidebar.delegate`) and studio (`sellerAdmins.permissions.reports_read`, `reports_export`).

- [ ] **Step 3: Final commit** (only if the user has authorized committing, and only if formatting/lint made changes)

```bash
git add -A
git commit -m "chore: format and lint fixes for delegated reports [GH-000]"
```

---

## Notes for the implementer

- **`SellerReportTable` receives `orders` and renders row-per-item.** Because Task 3 already filters `items` to delegated products, the table and Excel automatically show only delegated items — no component change needed.
- **`pnpm test --filter <app>`** scopes Vitest to one app; if the repo's runner differs, fall back to `pnpm test -- <file>` from the app directory.
- **Do not touch** `SellerReportsPage`, `exportSellerOrdersToExcel.ts`, or the `/api/seller/reports/orders` route — the owner flow must stay byte-for-byte unchanged.
- **Branch/PR:** create work on a `feat/GH-XXX_Delegated-Reports` branch per the repo git-workflow; target `develop`. Do not create the branch or PR without the user asking.

```

```
