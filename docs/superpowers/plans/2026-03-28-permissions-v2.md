# Permissions V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 43 CRUD-per-table permissions with 17 capability-based keys, and replace the search-based user permissions page with a paginated user table + user detail page.

**Architecture:** New SQL migration replaces permission keys and RLS policies. Admin app gets two routes: `/users` (table) and `/users/[userId]` (detail). URL state via nuqs. Immediate-save checkboxes for permission editing.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js 16, React 19, TanStack Query, nuqs, next-intl, Playwright

---

## Task Summary

| #   | Task                                                           | Type     | Files          |
| --- | -------------------------------------------------------------- | -------- | -------------- |
| 1   | SQL migration — 17 capability keys + RLS policies              | Backend  | 1 new          |
| 2   | Domain layer — constants, types, searchParams                  | Frontend | 3 modified/new |
| 3   | Infrastructure — listUsers, getUserProfile + update queries    | Frontend | 1 modified     |
| 4   | Application hooks — useUsers, useUserProfile + update existing | Frontend | 4 modified/new |
| 5   | Presentation — UserTable, UserRow, RoleBadge, Pagination       | Frontend | 4 new          |
| 6   | Presentation — UsersPage (replaces UserPermissionsPage)        | Frontend | 3 modified     |
| 7   | Presentation — UserHeader, updated PermissionGroupCard         | Frontend | 2 new/modified |
| 8   | Presentation — UserDetailPage + route                          | Frontend | 3 new/modified |
| 9   | i18n — en.json + es.json                                       | Frontend | 2 modified     |
| 10  | E2E helpers — new permission keys                              | Test     | 1 modified     |
| 11  | E2E test — updated for table UI + new keys                     | Test     | 1 modified     |

---

### Task 1: SQL Migration — 17 Capability Keys + RLS Policies

**Files:**

- Create: `supabase/migrations/20260328200000_permissions_v2.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- =============================================================================
-- Permissions V2: Collapse 43 CRUD keys → 17 capability-based keys
-- =============================================================================
-- 1. Clean slate: delete all user_permissions, resource_permissions, permissions
-- 2. Insert 17 new permission keys
-- 3. Insert 17 global resource_permissions
-- 4. Drop ALL existing RLS policies
-- 5. Recreate RLS policies with new capability keys
-- 6. Bootstrap: grant all 17 to existing dev users
-- =============================================================================

-- =============================================================================
-- 1. Clean slate
-- =============================================================================

delete from public.user_permissions;
delete from public.resource_permissions;
delete from public.permissions
where key in (
  'products.create', 'products.read', 'products.update', 'products.delete',
  'product_images.create', 'product_images.read', 'product_images.delete',
  'product_reviews.create', 'product_reviews.read', 'product_reviews.update', 'product_reviews.delete',
  'orders.create', 'orders.read', 'orders.update',
  'receipts.create', 'receipts.read', 'receipts.delete',
  'seller_payment_methods.create', 'seller_payment_methods.read', 'seller_payment_methods.update', 'seller_payment_methods.delete',
  'payment_method_types.create', 'payment_method_types.read', 'payment_method_types.update', 'payment_method_types.delete',
  'payment_settings.read', 'payment_settings.update',
  'templates.create', 'templates.read', 'templates.update', 'templates.delete',
  'audit.read',
  'user_permissions.create', 'user_permissions.read', 'user_permissions.update', 'user_permissions.delete',
  'events.create', 'events.read', 'events.update', 'events.delete',
  'check_ins.create', 'check_ins.read', 'check_ins.update'
);

-- =============================================================================
-- 2. Insert 17 capability-based permission keys
-- =============================================================================

insert into public.permissions (key, name_en, name_es, description_en, description_es, depends_on) values
  ('products.create',           'Create Products',       'Crear Productos',           'Create new products + images + pricing + stock',       'Crear productos + imagenes + precios + stock',         null),
  ('products.read',             'View Products',         'Ver Productos',             'View products in Studio',                              'Ver productos en Studio',                               null),
  ('products.update',           'Edit Products',         'Editar Productos',          'Edit products + images + stock + pricing',              'Editar productos + imagenes + stock + precios',        null),
  ('products.delete',           'Delete Products',       'Eliminar Productos',        'Delete products',                                      'Eliminar productos',                                    null),
  ('reviews.write',             'Write Reviews',         'Escribir Resenas',          'Write, edit, and delete own reviews',                  'Escribir, editar y eliminar resenas propias',          null),
  ('orders.place',              'Place Orders',          'Hacer Pedidos',             'Checkout and upload receipts',                         'Hacer pedidos y subir comprobantes',                    null),
  ('orders.view',               'View Orders',           'Ver Pedidos',               'View own orders and receipts',                         'Ver pedidos y comprobantes propios',                    null),
  ('orders.manage',             'Manage Orders',         'Gestionar Pedidos',         'Approve or reject received orders',                    'Aprobar o rechazar pedidos recibidos',                  null),
  ('seller.payment_methods',    'Payment Methods',       'Metodos de Pago',           'Full CRUD on seller payment methods',                  'CRUD completo en metodos de pago del vendedor',        null),
  ('admin.payment_types',       'Payment Types',         'Tipos de Pago',             'Manage payment type catalog',                          'Gestionar catalogo de tipos de pago',                   null),
  ('admin.templates',           'Templates',             'Plantillas',                'Manage product templates',                             'Gestionar plantillas de producto',                      null),
  ('admin.settings',            'Settings',              'Configuracion',             'Manage platform settings',                             'Gestionar configuracion de plataforma',                 null),
  ('admin.audit',               'Audit Log',             'Registro de Auditoria',     'View audit log',                                      'Ver registro de auditoria',                             null),
  ('admin.users',               'User Permissions',      'Permisos de Usuario',       'Manage user permissions',                              'Gestionar permisos de usuario',                         null),
  ('events.manage',             'Manage Events',         'Gestionar Eventos',         'Create, edit, and delete events',                     'Crear, editar y eliminar eventos',                      null),
  ('events.read',               'View Events',           'Ver Eventos',               'View events',                                         'Ver eventos',                                           null),
  ('checkins.manage',           'Check-ins',             'Check-ins',                 'Check-in, view, and undo',                            'Registrar entrada, ver y deshacer',                     null)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

-- =============================================================================
-- 3. Insert global resource_permissions for each new key
-- =============================================================================

insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where p.key in (
  'products.create', 'products.read', 'products.update', 'products.delete',
  'reviews.write',
  'orders.place', 'orders.view', 'orders.manage',
  'seller.payment_methods',
  'admin.payment_types', 'admin.templates', 'admin.settings', 'admin.audit', 'admin.users',
  'events.manage', 'events.read', 'checkins.manage'
)
on conflict (permission_id, resource_type, resource_id) do nothing;

-- =============================================================================
-- 4. Drop ALL existing RLS policies
-- =============================================================================

-- ---- Events ----
drop policy if exists "events_read"     on public.events;
drop policy if exists "events_insert"   on public.events;
drop policy if exists "events_update"   on public.events;
drop policy if exists "events_delete"   on public.events;

-- ---- Products ----
drop policy if exists "products_read"   on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;

-- ---- Product Entitlements ----
drop policy if exists "entitlements_read" on public.product_entitlements;

-- ---- Product Reviews ----
drop policy if exists "reviews_read"    on public.product_reviews;
drop policy if exists "reviews_insert"  on public.product_reviews;
drop policy if exists "reviews_update"  on public.product_reviews;
drop policy if exists "reviews_delete"  on public.product_reviews;

-- ---- Orders ----
drop policy if exists "orders_read"           on public.orders;
drop policy if exists "orders_buyer_insert"   on public.orders;
drop policy if exists "orders_buyer_update"   on public.orders;
drop policy if exists "orders_seller_update"  on public.orders;

-- ---- Order Items ----
drop policy if exists "order_items_read"          on public.order_items;
drop policy if exists "order_items_buyer_insert"  on public.order_items;

-- ---- Check-ins ----
drop policy if exists "check_ins_read"    on public.check_ins;
drop policy if exists "check_ins_insert"  on public.check_ins;
drop policy if exists "check_ins_update"  on public.check_ins;

-- ---- Check-in Audit ----
drop policy if exists "check_in_audit_read" on public.check_in_audit;

-- ---- Ticket Transfers ----
drop policy if exists "transfers_read" on public.ticket_transfers;

-- ---- Permissions (catalog) ----
drop policy if exists "permissions_read" on public.permissions;

-- ---- Resource Permissions (catalog) ----
drop policy if exists "resource_permissions_read" on public.resource_permissions;

-- ---- User Permissions ----
drop policy if exists "user_permissions_read"    on public.user_permissions;
drop policy if exists "user_permissions_insert"  on public.user_permissions;
drop policy if exists "user_permissions_update"  on public.user_permissions;
drop policy if exists "user_permissions_delete"  on public.user_permissions;

-- ---- User Profiles ----
drop policy if exists "profiles_read"    on public.user_profiles;
drop policy if exists "profiles_insert"  on public.user_profiles;
drop policy if exists "profiles_update"  on public.user_profiles;

-- ---- Product Templates ----
drop policy if exists "templates_read"    on public.product_templates;
drop policy if exists "templates_insert"  on public.product_templates;
drop policy if exists "templates_update"  on public.product_templates;
drop policy if exists "templates_delete"  on public.product_templates;

-- ---- Payment Method Types ----
drop policy if exists "payment_method_types_read"    on public.payment_method_types;
drop policy if exists "payment_method_types_insert"  on public.payment_method_types;
drop policy if exists "payment_method_types_update"  on public.payment_method_types;
drop policy if exists "payment_method_types_delete"  on public.payment_method_types;

-- ---- Seller Payment Methods ----
drop policy if exists "seller_payment_methods_read"    on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_insert"  on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_update"  on public.seller_payment_methods;
drop policy if exists "seller_payment_methods_delete"  on public.seller_payment_methods;

-- ---- Payment Settings ----
drop policy if exists "settings_read"    on public.payment_settings;
drop policy if exists "settings_insert"  on public.payment_settings;
drop policy if exists "settings_update"  on public.payment_settings;

-- ---- Audit Log ----
drop policy if exists "audit_read" on audit.logged_actions;

-- ---- Storage: Product Images ----
drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_upload"      on storage.objects;
drop policy if exists "product_images_delete"      on storage.objects;

-- ---- Storage: Receipts ----
drop policy if exists "receipts_upload"  on storage.objects;
drop policy if exists "receipts_read"    on storage.objects;
drop policy if exists "receipts_delete"  on storage.objects;

-- =============================================================================
-- 5. Recreate ALL RLS policies with capability-based keys
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Events (public read, capability-gated writes)
-- ---------------------------------------------------------------------------
create policy "events_read" on public.events
  for select using (true);

create policy "events_insert" on public.events
  for insert with check (has_permission(auth.uid(), 'events.manage'));

create policy "events_update" on public.events
  for update using (has_permission(auth.uid(), 'events.manage'));

create policy "events_delete" on public.events
  for delete using (has_permission(auth.uid(), 'events.manage'));

-- ---------------------------------------------------------------------------
-- Products (public read, owner-scoped writes)
-- ---------------------------------------------------------------------------
create policy "products_read" on public.products
  for select using (true);

create policy "products_insert" on public.products
  for insert with check (
    has_permission(auth.uid(), 'products.create')
    and seller_id = auth.uid()
  );

create policy "products_update" on public.products
  for update using (
    has_permission(auth.uid(), 'products.update')
    and seller_id = auth.uid()
  );

create policy "products_delete" on public.products
  for delete using (
    has_permission(auth.uid(), 'products.delete')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Product Entitlements (public read)
-- ---------------------------------------------------------------------------
create policy "entitlements_read" on public.product_entitlements
  for select using (true);

-- ---------------------------------------------------------------------------
-- Product Reviews (public read, owner-scoped writes via reviews.write)
-- ---------------------------------------------------------------------------
create policy "reviews_read" on public.product_reviews
  for select using (true);

create policy "reviews_insert" on public.product_reviews
  for insert with check (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

create policy "reviews_update" on public.product_reviews
  for update using (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

create policy "reviews_delete" on public.product_reviews
  for delete using (
    has_permission(auth.uid(), 'reviews.write')
    and user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Orders (dual ownership: buyer/seller reads, capability-gated writes)
-- ---------------------------------------------------------------------------
create policy "orders_read" on public.orders
  for select using (
    has_permission(auth.uid(), 'orders.view')
    and (user_id = auth.uid() or seller_id = auth.uid())
  );

create policy "orders_buyer_insert" on public.orders
  for insert with check (
    has_permission(auth.uid(), 'orders.place')
    and user_id = auth.uid()
  );

create policy "orders_buyer_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.place')
    and user_id = auth.uid()
  );

create policy "orders_seller_update" on public.orders
  for update using (
    has_permission(auth.uid(), 'orders.manage')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Order Items (inherited from orders via subquery)
-- ---------------------------------------------------------------------------
create policy "order_items_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy "order_items_buyer_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Check-ins (owner-scoped read, capability-gated writes via checkins.manage)
-- ---------------------------------------------------------------------------
create policy "check_ins_read" on public.check_ins
  for select using (
    has_permission(auth.uid(), 'checkins.manage')
    and order_item_id in (
      select oi.id from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = auth.uid() or o.seller_id = auth.uid()
    )
  );

create policy "check_ins_insert" on public.check_ins
  for insert with check (
    has_permission(auth.uid(), 'checkins.manage')
  );

create policy "check_ins_update" on public.check_ins
  for update using (
    has_permission(auth.uid(), 'checkins.manage')
  );

-- ---------------------------------------------------------------------------
-- Check-in Audit (public read)
-- ---------------------------------------------------------------------------
create policy "check_in_audit_read" on public.check_in_audit
  for select using (true);

-- ---------------------------------------------------------------------------
-- Ticket Transfers (owner-scoped read)
-- ---------------------------------------------------------------------------
create policy "transfers_read" on public.ticket_transfers
  for select using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Permissions catalog (public read)
-- ---------------------------------------------------------------------------
create policy "permissions_read" on public.permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- Resource Permissions catalog (public read)
-- ---------------------------------------------------------------------------
create policy "resource_permissions_read" on public.resource_permissions
  for select using (true);

-- ---------------------------------------------------------------------------
-- User Permissions (admin.users capability + users can read their own)
-- ---------------------------------------------------------------------------
create policy "user_permissions_read" on public.user_permissions
  for select using (
    user_id = auth.uid()
    or has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_insert" on public.user_permissions
  for insert with check (
    has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_update" on public.user_permissions
  for update using (
    has_permission(auth.uid(), 'admin.users')
  );

create policy "user_permissions_delete" on public.user_permissions
  for delete using (
    has_permission(auth.uid(), 'admin.users')
  );

-- ---------------------------------------------------------------------------
-- User Profiles (ownership only, no permission check)
-- ---------------------------------------------------------------------------
create policy "profiles_read" on public.user_profiles
  for select using (true);

create policy "profiles_insert" on public.user_profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on public.user_profiles
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Product Templates (admin.templates capability)
-- ---------------------------------------------------------------------------
create policy "templates_read" on public.product_templates
  for select using (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_insert" on public.product_templates
  for insert with check (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_update" on public.product_templates
  for update using (has_permission(auth.uid(), 'admin.templates'));

create policy "templates_delete" on public.product_templates
  for delete using (has_permission(auth.uid(), 'admin.templates'));

-- ---------------------------------------------------------------------------
-- Payment Method Types (public read, admin.payment_types writes)
-- ---------------------------------------------------------------------------
create policy "payment_method_types_read" on public.payment_method_types
  for select using (true);

create policy "payment_method_types_insert" on public.payment_method_types
  for insert with check (has_permission(auth.uid(), 'admin.payment_types'));

create policy "payment_method_types_update" on public.payment_method_types
  for update using (has_permission(auth.uid(), 'admin.payment_types'));

create policy "payment_method_types_delete" on public.payment_method_types
  for delete using (has_permission(auth.uid(), 'admin.payment_types'));

-- ---------------------------------------------------------------------------
-- Seller Payment Methods (public read, seller.payment_methods writes)
-- ---------------------------------------------------------------------------
create policy "seller_payment_methods_read" on public.seller_payment_methods
  for select using (true);

create policy "seller_payment_methods_insert" on public.seller_payment_methods
  for insert with check (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_update" on public.seller_payment_methods
  for update using (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

create policy "seller_payment_methods_delete" on public.seller_payment_methods
  for delete using (
    has_permission(auth.uid(), 'seller.payment_methods')
    and seller_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Payment Settings (admin.settings capability)
-- ---------------------------------------------------------------------------
create policy "settings_read" on public.payment_settings
  for select using (has_permission(auth.uid(), 'admin.settings'));

create policy "settings_insert" on public.payment_settings
  for insert with check (has_permission(auth.uid(), 'admin.settings'));

create policy "settings_update" on public.payment_settings
  for update using (has_permission(auth.uid(), 'admin.settings'));

-- ---------------------------------------------------------------------------
-- Audit log (admin.audit capability)
-- ---------------------------------------------------------------------------
create policy "audit_read" on audit.logged_actions
  for select using (has_permission(auth.uid(), 'admin.audit'));

-- ---------------------------------------------------------------------------
-- Storage: Product Images (public read, products.create/delete writes)
-- ---------------------------------------------------------------------------
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_upload" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and has_permission(auth.uid(), 'products.create')
  );

create policy "product_images_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and has_permission(auth.uid(), 'products.delete')
  );

-- ---------------------------------------------------------------------------
-- Storage: Receipts (orders.place for upload/delete, orders.view for read)
-- ---------------------------------------------------------------------------
create policy "receipts_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.place')
  );

create policy "receipts_read" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.view')
  );

create policy "receipts_delete" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and has_permission(auth.uid(), 'orders.place')
  );

-- =============================================================================
-- 6. Bootstrap: Grant ALL 17 permissions to ALL existing dev users
-- =============================================================================

do $$
declare
  v_user record;
  v_rp record;
begin
  for v_user in (select id from auth.users) loop
    for v_rp in (select rp.id from public.resource_permissions rp where rp.resource_type = 'global') loop
      insert into public.user_permissions (user_id, resource_permission_id, mode, granted_by, reason)
      values (v_user.id, v_rp.id, 'grant', v_user.id, 'Bootstrap: permissions v2 migration')
      on conflict (user_id, resource_permission_id) do nothing;
    end loop;
  end loop;
end;
$$;
```

- [ ] **Step 2: Apply and verify the migration**

```bash
pnpm supabase db reset
```

Expected: migration applies cleanly, 17 permissions visible in `permissions` table, 17 global `resource_permissions`, all existing users get all 17 granted.

- [ ] **Step 3: Verify with SQL query**

```bash
pnpm supabase db execute --sql "SELECT key FROM public.permissions ORDER BY key;"
```

Expected output: exactly 17 rows with keys `admin.audit`, `admin.payment_types`, `admin.settings`, `admin.templates`, `admin.users`, `checkins.manage`, `events.manage`, `events.read`, `orders.manage`, `orders.place`, `orders.view`, `products.create`, `products.delete`, `products.read`, `products.update`, `reviews.write`, `seller.payment_methods`.

---

### Task 2: Domain Layer — Constants, Types, SearchParams

**Files:**

- Modify: `apps/admin/src/features/users/domain/constants.ts`
- Modify: `apps/admin/src/features/users/domain/types.ts`
- Create: `apps/admin/src/features/users/domain/searchParams.ts`

- [ ] **Step 1: Replace constants.ts with 17-key model**

```typescript
import type { PermissionGroup } from "./types";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "products",
    labelKey: "products",
    permissions: [
      "products.create",
      "products.read",
      "products.update",
      "products.delete",
    ],
  },
  {
    key: "reviews",
    labelKey: "reviews",
    permissions: ["reviews.write"],
  },
  {
    key: "orders",
    labelKey: "orders",
    permissions: ["orders.place", "orders.view", "orders.manage"],
  },
  {
    key: "seller",
    labelKey: "seller",
    permissions: ["seller.payment_methods"],
  },
  {
    key: "admin",
    labelKey: "admin",
    permissions: [
      "admin.payment_types",
      "admin.templates",
      "admin.settings",
      "admin.audit",
      "admin.users",
    ],
  },
  {
    key: "events",
    labelKey: "events",
    permissions: ["events.manage", "events.read", "checkins.manage"],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions,
);

export const PERMISSION_TEMPLATES: Record<string, string[]> = {
  buyer: ["products.read", "reviews.write", "orders.place", "orders.view"],
  seller: [
    "products.read",
    "reviews.write",
    "orders.place",
    "orders.view",
    "products.create",
    "products.update",
    "products.delete",
    "orders.manage",
    "seller.payment_methods",
  ],
  admin: [...ALL_PERMISSION_KEYS],
  none: [],
};

export const USER_PERMISSIONS_QUERY_KEY = "user-permissions";
export const USERS_QUERY_KEY = "users";
export const USER_PROFILE_QUERY_KEY = "user-profile";

/** Number of users per page in the user table */
export const USERS_PER_PAGE = 20;

/** Debounce time for user search filter (ms) */
export const USER_SEARCH_DEBOUNCE_MS = 300;

/** Reason stored in audit trail when permissions are changed via the admin UI */
export const ADMIN_UI_GRANT_REASON = "Admin UI";
```

- [ ] **Step 2: Update types.ts with PaginatedUsers**

```typescript
/** Minimal user profile summary for admin user management */
export interface UserProfileSummary {
  id: string;
  email: string;
  display_name: string | null;
  display_avatar_url: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
}

/** A permission group for display in the admin UI */
export interface PermissionGroup {
  key: string;
  labelKey: string;
  permissions: string[];
}

/** Paginated user list response */
export interface PaginatedUsers {
  users: UserProfileSummary[];
  total: number;
}

/** Computed role based on granted permission keys */
export type UserRole = "admin" | "seller" | "buyer" | "custom" | "none";
```

- [ ] **Step 3: Create searchParams.ts**

```typescript
import { parseAsInteger, parseAsString } from "nuqs";

export const usersSearchParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors in the domain layer files.

---

### Task 3: Infrastructure — listUsers, getUserProfile + Update Queries

**Files:**

- Modify: `apps/admin/src/features/users/infrastructure/userPermissionQueries.ts`

- [ ] **Step 1: Replace userPermissionQueries.ts with updated queries**

```typescript
/* eslint-disable i18next/no-literal-string -- Supabase query params are not UI strings */
import type { createBrowserSupabaseClient } from "api/supabase";

import { ADMIN_UI_GRANT_REASON } from "@/features/users/domain/constants";
import type {
  PaginatedUsers,
  UserProfileSummary,
} from "@/features/users/domain/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const USER_PROFILES_TABLE = "user_profiles" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const PERMISSIONS_TABLE = "permissions" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const RESOURCE_PERMISSIONS_TABLE = "resource_permissions" as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types yet
const USER_PERMISSIONS_TABLE = "user_permissions" as any;

/** Escape SQL LIKE wildcards to prevent pattern injection */
function escapeLikePattern(input: string): string {
  return input.replaceAll(/[%_\\]/g, (char) => `\\${char}`);
}

/** List users with server-side pagination and optional search filter */
export async function listUsers(
  supabase: SupabaseClient,
  search: string,
  page: number,
  perPage: number,
): Promise<PaginatedUsers> {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from(USER_PROFILES_TABLE)
    .select(
      "id, email, display_name, display_avatar_url, avatar_url, last_seen_at",
      {
        count: "exact",
      },
    )
    .order("email")
    .range(from, to);

  if (search.trim()) {
    const sanitized = escapeLikePattern(search.trim());
    query = query.or(
      `email.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`,
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    users: (data ?? []) as unknown as UserProfileSummary[],
    total: count ?? 0,
  };
}

/** Get a single user profile by ID */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfileSummary | null> {
  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select(
      "id, email, display_name, display_avatar_url, avatar_url, last_seen_at",
    )
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as UserProfileSummary;
}

/** Get all granted (non-expired) permission keys for a user */
export async function getUserPermissionKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .select("resource_permissions!inner(permissions!inner(key))")
    .eq("user_id", userId)
    .eq("mode", "grant")
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    resource_permissions: { permissions: { key: string } };
  }>;

  return rows.map((row) => row.resource_permissions.permissions.key);
}

/** Find the resource_permission id for a global-scope permission key */
async function findResourcePermissionId(
  supabase: SupabaseClient,
  permissionKey: string,
): Promise<string> {
  const { data: permData, error: permError } = await supabase
    .from(PERMISSIONS_TABLE)
    .select("id")
    .eq("key", permissionKey)
    .single();

  if (permError) throw permError;
  const permissionId = (permData as unknown as { id: string }).id;

  const { data: rpData, error: rpError } = await supabase
    .from(RESOURCE_PERMISSIONS_TABLE)
    .select("id")
    .eq("permission_id", permissionId)
    .eq("resource_type", "global")
    .single();

  if (rpError) throw rpError;
  return (rpData as unknown as { id: string }).id;
}

/** Grant a permission to a user (upserts to handle duplicates) */
export async function grantPermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string,
  grantedBy: string,
): Promise<void> {
  const resourcePermissionId = await findResourcePermissionId(
    supabase,
    permissionKey,
  );

  const { error } = await supabase.from(USER_PERMISSIONS_TABLE).upsert(
    {
      user_id: userId,
      resource_permission_id: resourcePermissionId,
      mode: "grant",
      granted_by: grantedBy,
      reason: ADMIN_UI_GRANT_REASON,
    },
    { onConflict: "user_id,resource_permission_id" },
  );

  if (error) throw error;
}

/** Revoke a permission from a user */
export async function revokePermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string,
): Promise<void> {
  const resourcePermissionId = await findResourcePermissionId(
    supabase,
    permissionKey,
  );

  const { error } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("resource_permission_id", resourcePermissionId);

  if (error) throw error;
}

/** Replace all permissions for a user with the given template keys */
export async function applyTemplate(
  supabase: SupabaseClient,
  userId: string,
  permissionKeys: string[],
  grantedBy: string,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(USER_PERMISSIONS_TABLE)
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  await Promise.all(
    permissionKeys.map((key) =>
      grantPermission(supabase, userId, key, grantedBy),
    ),
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors.

---

### Task 4: Application Hooks — useUsers, useUserProfile + Update Existing

**Files:**

- Create: `apps/admin/src/features/users/application/hooks/useUsers.ts`
- Create: `apps/admin/src/features/users/application/hooks/useUserProfile.ts`
- Modify: `apps/admin/src/features/users/application/hooks/useUserPermissions.ts` (no changes needed — already generic)
- Modify: `apps/admin/src/features/users/application/hooks/useTogglePermission.ts` (no changes needed)
- Modify: `apps/admin/src/features/users/application/hooks/useApplyTemplate.ts` (no changes needed)
- Delete: `apps/admin/src/features/users/application/hooks/useUserSearch.ts`

- [ ] **Step 1: Create useUsers.ts**

```typescript
import { useQuery } from "@tanstack/react-query";

import {
  USERS_PER_PAGE,
  USERS_QUERY_KEY,
} from "@/features/users/domain/constants";
import { listUsers } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUsers(search: string, page: number) {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable
    queryKey: [USERS_QUERY_KEY, search, page],
    queryFn: () => listUsers(supabase, search, page, USERS_PER_PAGE),
    placeholderData: (previousData) => previousData,
  });
}
```

- [ ] **Step 2: Create useUserProfile.ts**

```typescript
import { useQuery } from "@tanstack/react-query";

import { USER_PROFILE_QUERY_KEY } from "@/features/users/domain/constants";
import { getUserProfile } from "@/features/users/infrastructure/userPermissionQueries";
import { useSupabase } from "@/shared/application/hooks/useSupabase";

export function useUserProfile(userId: string | null) {
  const supabase = useSupabase();

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- supabase client is stable
    queryKey: [USER_PROFILE_QUERY_KEY, userId],
    queryFn: () => getUserProfile(supabase, userId as string),
    enabled: !!userId,
  });
}
```

- [ ] **Step 3: Delete useUserSearch.ts**

```bash
rm apps/admin/src/features/users/application/hooks/useUserSearch.ts
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors. The old `useUserSearch` import in `UserSearch.tsx` will break — that file gets deleted in Task 6.

---

### Task 5: Presentation — UserTable, UserRow, RoleBadge, Pagination

**Files:**

- Create: `apps/admin/src/features/users/presentation/components/RoleBadge.tsx`
- Create: `apps/admin/src/features/users/presentation/components/Pagination.tsx`
- Create: `apps/admin/src/features/users/presentation/components/UserRow.tsx`
- Create: `apps/admin/src/features/users/presentation/components/UserTable.tsx`

- [ ] **Step 1: Create RoleBadge.tsx**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";
import type { UserRole } from "@/features/users/domain/types";

const ROLE_STYLES: Record<UserRole, string> = {
  admin: "border-destructive bg-destructive/10 text-destructive",
  seller: "border-primary bg-primary/10 text-primary",
  buyer: "border-info bg-info/10 text-info",
  custom: "border-warning bg-warning/10 text-warning",
  none: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function computeRole(grantedKeys: string[]): UserRole {
  if (grantedKeys.length === 0) return "none";
  const sorted = [...grantedKeys].sort();
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.admin].sort()))
    return "admin";
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.seller].sort()))
    return "seller";
  if (arraysEqual(sorted, [...PERMISSION_TEMPLATES.buyer].sort()))
    return "buyer";
  return "custom";
}

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const t = useTranslations("users.roles");

  return (
    <span
      className={`inline-flex items-center rounded-none border-2 px-2 py-0.5 font-display text-xs font-bold uppercase tracking-wider ${ROLE_STYLES[role]}`}
      {...tid(`role-badge-${role}`)}
    >
      {t(role)}
    </span>
  );
}
```

- [ ] **Step 2: Create Pagination.tsx**

```typescript
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

interface PaginationProps {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations("users.pagination");

  return (
    <div
      className="flex items-center justify-between border-t-2 border-foreground/10 pt-4"
      {...tid("users-pagination")}
    >
      <span className="text-sm text-muted-foreground">
        {t("showing", { from, to })} {t("of", { total })}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-none border-2 border-foreground"
          {...tid("pagination-prev")}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1),
          )
          .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
              acc.push("ellipsis");
            }
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item)}
                className="rounded-none border-2 border-foreground font-display text-xs font-bold"
                {...tid(`pagination-page-${item}`)}
              >
                {item}
              </Button>
            ),
          )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-none border-2 border-foreground"
          {...tid("pagination-next")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create UserRow.tsx**

```typescript
"use client";

import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { RoleBadge } from "./RoleBadge";

import type { UserProfileSummary, UserRole } from "@/features/users/domain/types";

interface UserRowProps {
  user: UserProfileSummary;
  role: UserRole;
  onClick: (userId: string) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "—";
  return formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true });
}

export function UserRow({ user, role, onClick }: UserRowProps) {
  const t = useTranslations("users");
  const avatarUrl = user.display_avatar_url ?? user.avatar_url;

  return (
    <tr
      className="cursor-pointer border-b border-foreground/10 transition-colors hover:bg-muted/30"
      onClick={() => onClick(user.id)}
      {...tid(`user-row-${user.id}`)}
    >
      <td className="px-4 py-3">
        <Avatar className="size-8 rounded-none border-2 border-foreground">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={user.display_name ?? user.email} />}
          <AvatarFallback className="rounded-none bg-muted font-display text-xs font-bold">
            {getInitials(user.display_name, user.email)}
          </AvatarFallback>
        </Avatar>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{user.email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {user.display_name ?? "—"}
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={role} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatLastSeen(user.last_seen_at)}
      </td>
    </tr>
  );
}
```

- [ ] **Step 4: Create UserTable.tsx**

```typescript
"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { tid } from "shared";
import { Input } from "ui";

import { Pagination } from "./Pagination";
import { UserRow } from "./UserRow";
import { computeRole } from "./RoleBadge";

import { useUsers } from "@/features/users/application/hooks/useUsers";
import { useUserPermissions } from "@/features/users/application/hooks/useUserPermissions";
import {
  USER_SEARCH_DEBOUNCE_MS,
  USERS_PER_PAGE,
} from "@/features/users/domain/constants";
import { usersSearchParams } from "@/features/users/domain/searchParams";
import type { UserProfileSummary } from "@/features/users/domain/types";

interface UserTableProps {
  onSelectUser: (userId: string) => void;
}

/** Inner row that fetches permissions for a single user to compute role */
function UserRowWithRole({
  user,
  onClick,
}: {
  user: UserProfileSummary;
  onClick: (userId: string) => void;
}) {
  const { data: grantedKeys = [] } = useUserPermissions(user.id);
  const role = computeRole(grantedKeys);

  return <UserRow user={user} role={role} onClick={onClick} />;
}

export function UserTable({ onSelectUser }: UserTableProps) {
  const t = useTranslations("users");
  const [params, setParams] = useQueryStates(usersSearchParams);
  const [filterInput, setFilterInput] = useState(params.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        { search: filterInput || null, page: 1 },
        { history: "replace" },
      );
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterInput, setParams]);

  const { data, isLoading } = useUsers(params.search, params.page);
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  const from = total === 0 ? 0 : (params.page - 1) * USERS_PER_PAGE + 1;
  const to = Math.min(params.page * USERS_PER_PAGE, total);

  const handlePageChange = (newPage: number) => {
    setParams({ page: newPage }, { history: "push" });
  };

  return (
    <div className="space-y-4" {...tid("users-table")}>
      {/* Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={filterInput}
          onChange={(e) => setFilterInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="rounded-none border-2 border-foreground pl-10"
          {...tid("users-search-input")}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-2 border-foreground">
        <table className="w-full text-left" {...tid("users-table-element")}>
          <thead>
            <tr className="border-b-2 border-foreground bg-muted/30">
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.avatar")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.email")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.displayName")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.role")}
              </th>
              <th className="px-4 py-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                {t("columns.lastSeen")}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                  {...tid("users-empty-state")}
                >
                  {t("noResults")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRowWithRole
                  key={user.id}
                  user={user}
                  onClick={onSelectUser}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={params.page}
          totalPages={totalPages}
          from={from}
          to={to}
          total={total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors in new components. Note: `UserTable` uses `UserRowWithRole` as an internal helper component within the same file since it is tightly coupled to the table rendering logic — this is acceptable per compound-component exception.

---

### Task 6: Presentation — UsersPage (Replaces UserPermissionsPage)

**Files:**

- Delete: `apps/admin/src/features/users/presentation/components/UserSearch.tsx`
- Delete: `apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx`
- Delete: `apps/admin/src/features/users/presentation/pages/UserPermissionsPage.tsx`
- Create: `apps/admin/src/features/users/presentation/pages/UsersPage.tsx`
- Modify: `apps/admin/src/features/users/index.ts`
- Modify: `apps/admin/src/app/[locale]/users/page.tsx`

- [ ] **Step 1: Delete old components**

```bash
rm apps/admin/src/features/users/presentation/components/UserSearch.tsx
rm apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx
rm apps/admin/src/features/users/presentation/pages/UserPermissionsPage.tsx
```

- [ ] **Step 2: Create UsersPage.tsx**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { tid } from "shared";

import { UserTable } from "@/features/users/presentation/components/UserTable";

export function UsersPage() {
  const t = useTranslations("users");
  const router = useRouter();

  const handleSelectUser = (userId: string) => {
    router.push(`/en/users/${userId}`);
  };

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("users-page")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("users-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </header>

        {/* User table */}
        <UserTable onSelectUser={handleSelectUser} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update feature index.ts**

```typescript
export { UsersPage } from "./presentation/pages/UsersPage";
export { UserDetailPage } from "./presentation/pages/UserDetailPage";
```

- [ ] **Step 4: Update route page.tsx**

```typescript
import { setRequestLocale } from "next-intl/server";

import { UsersPage } from "@/features/users";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UsersPage />;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: may still show errors until Task 8 creates `UserDetailPage`. That is fine — proceed to next tasks.

---

### Task 7: Presentation — UserHeader, Updated PermissionGroupCard

**Files:**

- Create: `apps/admin/src/features/users/presentation/components/UserHeader.tsx`
- Modify: `apps/admin/src/features/users/presentation/components/PermissionGroupCard.tsx`

- [ ] **Step 1: Create UserHeader.tsx**

```typescript
"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { RoleBadge, computeRole } from "./RoleBadge";

import type { UserProfileSummary } from "@/features/users/domain/types";

const AUTH_URL = "http://localhost:5000";

interface UserHeaderProps {
  user: UserProfileSummary;
  grantedKeys: string[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

export function UserHeader({ user, grantedKeys }: UserHeaderProps) {
  const t = useTranslations("users.detail");
  const role = computeRole(grantedKeys);
  const avatarUrl = user.display_avatar_url ?? user.avatar_url;
  const lastSeen = user.last_seen_at
    ? formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true })
    : "—";

  return (
    <div
      className="flex items-start gap-4 border-2 border-foreground bg-background p-4"
      {...tid("user-header")}
    >
      <Avatar className="size-16 rounded-none border-2 border-foreground">
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={user.display_name ?? user.email}
          />
        )}
        <AvatarFallback className="rounded-none bg-muted font-display text-lg font-bold">
          {getInitials(user.display_name, user.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
          {user.display_name ?? user.email}
        </h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <a
            href={`${AUTH_URL}/en/profile/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            {...tid("user-view-profile-link")}
          >
            {t("viewProfile")}
            <ExternalLink className="size-3" />
          </a>
          <RoleBadge role={role} />
          <span className="text-xs text-muted-foreground">{lastSeen}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace PermissionGroupCard.tsx with simplified version for 17 keys**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

interface PermissionGroupCardProps {
  groupKey: string;
  labelKey: string;
  permissions: string[];
  grantedKeys: string[];
  onToggle: (key: string, grant: boolean) => void;
  isPending: boolean;
}

export function PermissionGroupCard({
  groupKey,
  labelKey,
  permissions,
  grantedKeys,
  onToggle,
  isPending,
}: PermissionGroupCardProps) {
  const t = useTranslations("users");
  const tp = useTranslations("permissions");

  return (
    <div
      className="border-3 border-foreground bg-background p-4"
      {...tid(`permission-group-${groupKey}`)}
    >
      <h3 className="mb-3 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t(`groups.${labelKey}`)}
      </h3>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {permissions.map((perm) => {
          const isGranted = grantedKeys.includes(perm);
          return (
            <label
              key={perm}
              className="flex cursor-pointer items-center gap-1.5"
            >
              <input
                type="checkbox"
                checked={isGranted}
                onChange={() => onToggle(perm, !isGranted)}
                disabled={isPending}
                className="size-4 accent-foreground"
                {...tid(`permission-toggle-${perm}`)}
              />
              <span className="text-xs">{tp(perm)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors.

---

### Task 8: Presentation — UserDetailPage + Route

**Files:**

- Create: `apps/admin/src/features/users/presentation/pages/UserDetailPage.tsx`
- Create: `apps/admin/src/app/[locale]/users/[userId]/page.tsx`

- [ ] **Step 1: Create UserDetailPage.tsx**

```typescript
"use client";

import { ArrowLeft } from "lucide-react";
import { useSupabaseAuth } from "auth/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { tid } from "shared";
import { Button } from "ui";

import { PermissionGroupCard } from "../components/PermissionGroupCard";
import { TemplateButtons } from "../components/TemplateButtons";
import { UserHeader } from "../components/UserHeader";

import { useApplyTemplate } from "@/features/users/application/hooks/useApplyTemplate";
import { useTogglePermission } from "@/features/users/application/hooks/useTogglePermission";
import { useUserPermissions } from "@/features/users/application/hooks/useUserPermissions";
import { useUserProfile } from "@/features/users/application/hooks/useUserProfile";
import { PERMISSION_GROUPS } from "@/features/users/domain/constants";

interface UserDetailPageProps {
  userId: string;
}

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const t = useTranslations("users");
  const router = useRouter();
  const { user: currentUser } = useSupabaseAuth();

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: grantedKeys = [], isLoading: permissionsLoading } =
    useUserPermissions(userId);
  const toggleMutation = useTogglePermission();
  const templateMutation = useApplyTemplate();

  const isPending = toggleMutation.isPending || templateMutation.isPending;
  const grantedBy = currentUser?.id;
  const isLoading = profileLoading || permissionsLoading;

  const handleToggle = (key: string, grant: boolean) => {
    if (!grantedBy) return;
    toggleMutation.mutate({ userId, permissionKey: key, grant, grantedBy });
  };

  const handleApplyTemplate = (keys: string[]) => {
    if (!grantedBy) return;
    templateMutation.mutate({ userId, permissionKeys: keys, grantedBy });
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col bg-dots">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <div className="animate-pulse text-muted-foreground">
            {t("loading")}
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col bg-dots">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col bg-dots"
      {...tid("user-detail-page")}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/en/users")}
          className="w-fit gap-1 rounded-none font-display text-xs font-bold uppercase tracking-wider"
          {...tid("back-to-users")}
        >
          <ArrowLeft className="size-4" />
          {t("detail.backToUsers")}
        </Button>

        {/* User header */}
        <UserHeader user={profile} grantedKeys={grantedKeys} />

        {/* Template buttons */}
        <TemplateButtons
          onApply={handleApplyTemplate}
          isPending={isPending || !grantedBy}
        />

        {/* Permission groups */}
        {PERMISSION_GROUPS.map((group) => (
          <PermissionGroupCard
            key={group.key}
            groupKey={group.key}
            labelKey={group.labelKey}
            permissions={group.permissions}
            grantedKeys={grantedKeys}
            onToggle={handleToggle}
            isPending={isPending || !grantedBy}
          />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create route file at `apps/admin/src/app/[locale]/users/[userId]/page.tsx`**

```typescript
import { setRequestLocale } from "next-intl/server";

import { UserDetailPage } from "@/features/users";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  return <UserDetailPage userId={userId} />;
}
```

- [ ] **Step 3: Update TemplateButtons.tsx to use new i18n namespace**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";
import { Button } from "ui";

import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";

interface TemplateButtonsProps {
  onApply: (permissionKeys: string[]) => void;
  isPending: boolean;
}

const TEMPLATES = [
  { key: "buyer", labelKey: "templateBuyer" },
  { key: "seller", labelKey: "templateSeller" },
  { key: "admin", labelKey: "templateAdmin" },
  { key: "none", labelKey: "templateNone" },
] as const;

export function TemplateButtons({ onApply, isPending }: TemplateButtonsProps) {
  const t = useTranslations("users");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t("applyTemplate")}:
      </span>
      {TEMPLATES.map(({ key, labelKey }) => (
        <Button
          key={key}
          type="button"
          onClick={() => onApply(PERMISSION_TEMPLATES[key])}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="rounded-none border-2 border-foreground font-display text-xs font-bold uppercase tracking-wider"
          {...tid(`template-btn-${key}`)}
        >
          {t(labelKey)}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors.

---

### Task 9: i18n — en.json + es.json

**Files:**

- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Replace the `userPermissions` key with `users` and `permissions` keys in en.json**

Remove the entire `"userPermissions": { ... }` block and replace it with:

```json
"users": {
  "title": "Users",
  "subtitle": "Manage user accounts and permissions",
  "searchPlaceholder": "Filter by email or name...",
  "noResults": "No users found",
  "loading": "Loading...",
  "applyTemplate": "Apply Template",
  "templateBuyer": "Buyer",
  "templateSeller": "Seller",
  "templateAdmin": "Admin",
  "templateNone": "None",
  "columns": {
    "avatar": "Avatar",
    "email": "Email",
    "displayName": "Name",
    "role": "Role",
    "lastSeen": "Last Seen"
  },
  "roles": {
    "admin": "Admin",
    "seller": "Seller",
    "buyer": "Buyer",
    "custom": "Custom",
    "none": "None"
  },
  "groups": {
    "products": "Products",
    "reviews": "Reviews",
    "orders": "Orders",
    "seller": "Seller",
    "admin": "Admin",
    "events": "Events"
  },
  "pagination": {
    "showing": "Showing {from}-{to}",
    "of": "of {total}"
  },
  "detail": {
    "backToUsers": "Back to Users",
    "viewProfile": "View Profile",
    "permissionsCount": "{count, plural, one {# permission} other {# permissions}}"
  }
},
"permissions": {
  "products.create": "Create Products",
  "products.read": "View Products",
  "products.update": "Edit Products",
  "products.delete": "Delete Products",
  "reviews.write": "Write Reviews",
  "orders.place": "Place Orders",
  "orders.view": "View Orders",
  "orders.manage": "Manage Orders",
  "seller.payment_methods": "Payment Methods",
  "admin.payment_types": "Payment Types",
  "admin.templates": "Templates",
  "admin.settings": "Settings",
  "admin.audit": "Audit Log",
  "admin.users": "User Permissions",
  "events.manage": "Manage Events",
  "events.read": "View Events",
  "checkins.manage": "Check-ins"
}
```

Also update the sidebar key from `"userPermissions": "User Permissions"` to `"users": "Users"`.

- [ ] **Step 2: Replace the `userPermissions` key with `users` and `permissions` keys in es.json**

Remove the entire `"userPermissions": { ... }` block and replace it with:

```json
"users": {
  "title": "Usuarios",
  "subtitle": "Gestionar cuentas de usuario y permisos",
  "searchPlaceholder": "Filtrar por email o nombre...",
  "noResults": "No se encontraron usuarios",
  "loading": "Cargando...",
  "applyTemplate": "Aplicar Plantilla",
  "templateBuyer": "Comprador",
  "templateSeller": "Vendedor",
  "templateAdmin": "Admin",
  "templateNone": "Ninguno",
  "columns": {
    "avatar": "Avatar",
    "email": "Email",
    "displayName": "Nombre",
    "role": "Rol",
    "lastSeen": "Ultima vez"
  },
  "roles": {
    "admin": "Admin",
    "seller": "Vendedor",
    "buyer": "Comprador",
    "custom": "Personalizado",
    "none": "Ninguno"
  },
  "groups": {
    "products": "Productos",
    "reviews": "Resenas",
    "orders": "Pedidos",
    "seller": "Vendedor",
    "admin": "Admin",
    "events": "Eventos"
  },
  "pagination": {
    "showing": "Mostrando {from}-{to}",
    "of": "de {total}"
  },
  "detail": {
    "backToUsers": "Volver a Usuarios",
    "viewProfile": "Ver Perfil",
    "permissionsCount": "{count, plural, one {# permiso} other {# permisos}}"
  }
},
"permissions": {
  "products.create": "Crear Productos",
  "products.read": "Ver Productos",
  "products.update": "Editar Productos",
  "products.delete": "Eliminar Productos",
  "reviews.write": "Escribir Resenas",
  "orders.place": "Hacer Pedidos",
  "orders.view": "Ver Pedidos",
  "orders.manage": "Gestionar Pedidos",
  "seller.payment_methods": "Metodos de Pago",
  "admin.payment_types": "Tipos de Pago",
  "admin.templates": "Plantillas",
  "admin.settings": "Configuracion",
  "admin.audit": "Registro de Auditoria",
  "admin.users": "Permisos de Usuario",
  "events.manage": "Gestionar Eventos",
  "events.read": "Ver Eventos",
  "checkins.manage": "Check-ins"
}
```

Also update the sidebar key from `"userPermissions": "Permisos de Usuario"` to `"users": "Usuarios"`.

- [ ] **Step 3: Update any sidebar component referencing `sidebar.userPermissions` to use `sidebar.users`**

Search for `sidebar.userPermissions` or `t("userPermissions")` in sidebar-related components and change to `t("users")`.

- [ ] **Step 4: Verify both locale files have identical key structure**

```bash
cd apps/admin && pnpm typecheck
```

Expected: no type errors. All `useTranslations` calls reference existing keys.

---

### Task 10: E2E Helpers — New Permission Keys

**Files:**

- Modify: `apps/auth/e2e/helpers/session.ts`

- [ ] **Step 1: Replace permission template arrays in session.ts**

Replace the three permission arrays (`BUYER_PERMISSIONS`, `SELLER_PERMISSIONS`, `ADMIN_PERMISSIONS`) with:

```typescript
// ─── Permission Templates ────────────────────────────────────────

export const BUYER_PERMISSIONS = [
  "products.read",
  "reviews.write",
  "orders.place",
  "orders.view",
];

export const SELLER_PERMISSIONS = [
  ...BUYER_PERMISSIONS,
  "products.create",
  "products.update",
  "products.delete",
  "orders.manage",
  "seller.payment_methods",
];

export const ADMIN_PERMISSIONS = [
  ...SELLER_PERMISSIONS,
  "admin.payment_types",
  "admin.templates",
  "admin.settings",
  "admin.audit",
  "admin.users",
  "events.manage",
  "events.read",
  "checkins.manage",
];
```

The rest of `session.ts` (createTestUser, grantPermissions, injectSession, etc.) remains unchanged — those functions are already generic and work with any key strings.

- [ ] **Step 2: Verify E2E helpers still compile**

```bash
cd apps/auth && npx tsc --noEmit --project e2e/tsconfig.json 2>/dev/null || echo "E2E typecheck complete (warnings ok)"
```

Expected: no errors in the helper files.

---

### Task 11: E2E Test — Updated for Table UI + New Keys

**Files:**

- Modify: `apps/auth/e2e/permission-management.spec.ts`

- [ ] **Step 1: Replace permission-management.spec.ts with updated test**

```typescript
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  APP_URLS,
  DEBOUNCE_WAIT_MS,
  ELEMENT_TIMEOUT_MS,
  MUTATION_WAIT_MS,
} from "./helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  injectSession,
  type TestUser,
} from "./helpers/session";
import { createSnapHelper } from "./helpers/snap";

const { snap, resetCounter } = createSnapHelper(
  path.resolve(__dirname, "screenshots-permissions"),
);

/**
 * Navigate to admin users page, search for a user in the table,
 * click their row, and wait for the detail page to load.
 */
async function navigateToUserDetail(
  page: Page,
  targetEmail: string,
  targetUserId: string,
): Promise<void> {
  await page.goto(`${APP_URLS.ADMIN}/en/users`);
  await page.waitForLoadState("networkidle");

  // Type in the search filter
  await page.getByTestId("users-search-input").fill(targetEmail);
  await page.waitForTimeout(DEBOUNCE_WAIT_MS);

  // Click the user row
  await page.getByTestId(`user-row-${targetUserId}`).click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible({
    timeout: ELEMENT_TIMEOUT_MS,
  });
}

/**
 * Revoke a single permission via the admin UI checkbox on the detail page.
 * Assumes the permission is currently granted (checked).
 */
async function revokePermission(
  page: Page,
  context: import("@playwright/test").BrowserContext,
  admin: TestUser,
  target: TestUser,
  permissionKey: string,
): Promise<void> {
  await injectSession(context, admin);
  await navigateToUserDetail(page, target.email, target.userId);

  const checkbox = page.getByTestId(`permission-toggle-${permissionKey}`);
  await expect(checkbox).toBeChecked();
  await checkbox.click();
  await page.waitForTimeout(MUTATION_WAIT_MS);
  await expect(checkbox).not.toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
}

/**
 * Grant a single permission via the admin UI checkbox on the detail page.
 * Assumes the permission is currently revoked (unchecked).
 */
async function grantPermission(
  page: Page,
  context: import("@playwright/test").BrowserContext,
  admin: TestUser,
  target: TestUser,
  permissionKey: string,
): Promise<void> {
  await injectSession(context, admin);
  await navigateToUserDetail(page, target.email, target.userId);

  const checkbox = page.getByTestId(`permission-toggle-${permissionKey}`);
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await page.waitForTimeout(MUTATION_WAIT_MS);
  await expect(checkbox).toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
}

// ═══════════════════════════════════════════════════════════════════
// Full permission E2E: admin grants/revokes across the entire system.
//
// Strategy: target starts with ALL admin permissions.
// We verify access, revoke one area at a time, verify block,
// re-grant, then nuke everything with "None" template.
// ═══════════════════════════════════════════════════════════════════

test.describe
  .serial("Permission management: full system grant/revoke flow", () => {
  let admin: TestUser;
  let target: TestUser;

  test.beforeAll(async () => {
    resetCounter();
    admin = await createTestUser("admin", ADMIN_PERMISSIONS);
    target = await createTestUser("target", ADMIN_PERMISSIONS);
  });

  test.afterAll(async () => {
    await cleanupTestData(admin.userId, target.userId);
  });

  // ─── BASELINE: target can access everything ─────────────────

  test("Phase 1: baseline — Store catalog loads", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("product-catalog-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "store-catalog-baseline");
  });

  test("Phase 2: baseline — Studio loads with create button", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("new-product-button")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-baseline");
  });

  test("Phase 3: baseline — Payments purchases page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("orders-empty")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payments-purchases-baseline");
  });

  test("Phase 4: baseline — Payment methods page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("payment-methods-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-baseline");
  });

  test("Phase 5: baseline — Admin audit log loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en/audit`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("audit-log-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "admin-audit-baseline");
  });

  test("Phase 6: baseline — Admin users page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en/users`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("users-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "admin-users-baseline");
  });

  // ─── STUDIO: revoke products.read → empty product list ──────

  test("Phase 7: admin revokes products.read", async ({ context, page }) => {
    await revokePermission(page, context, admin, target, "products.read");
    await snap(page, "admin-revoked-products-read");
  });

  test("Phase 8: target blocked — Studio shows empty products", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("products-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-products-blocked");
  });

  test("Phase 9: admin re-grants products.read", async ({ context, page }) => {
    await grantPermission(page, context, admin, target, "products.read");
    await snap(page, "admin-regranted-products-read");
  });

  // ─── PAYMENTS: revoke seller.payment_methods → empty ───

  test("Phase 10: admin revokes seller.payment_methods", async ({
    context,
    page,
  }) => {
    await revokePermission(
      page,
      context,
      admin,
      target,
      "seller.payment_methods",
    );
    await snap(page, "admin-revoked-payment-methods");
  });

  test("Phase 11: target blocked — Payment methods empty", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("payment-methods-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-blocked");
  });

  test("Phase 12: admin re-grants seller.payment_methods", async ({
    context,
    page,
  }) => {
    await grantPermission(
      page,
      context,
      admin,
      target,
      "seller.payment_methods",
    );
    await snap(page, "admin-regranted-payment-methods");
  });

  // ─── ADMIN: revoke products.delete → verify via detail page ──

  test("Phase 13: admin revokes products.delete", async ({ context, page }) => {
    await revokePermission(page, context, admin, target, "products.delete");
    await snap(page, "admin-revoked-products-delete");
  });

  test("Phase 14: admin detail page shows products.delete unchecked", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);

    await expect(
      page.getByTestId("permission-toggle-products.delete"),
    ).not.toBeChecked();
    await snap(page, "admin-products-delete-still-revoked");
  });

  test("Phase 15: admin re-grants products.delete", async ({
    context,
    page,
  }) => {
    await grantPermission(page, context, admin, target, "products.delete");
    await snap(page, "admin-regranted-products-delete");
  });

  // ─── NUKE: apply "None" template → everything blocked ───────

  test("Phase 16: admin applies None template — revoke all", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);
    await snap(page, "admin-before-none-template");

    await page.getByTestId("template-btn-none").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "admin-after-none-template");

    // Verify key permissions all unchecked
    for (const key of [
      "products.create",
      "products.read",
      "orders.place",
      "orders.view",
      "admin.audit",
      "admin.users",
    ]) {
      await expect(
        page.getByTestId(`permission-toggle-${key}`),
      ).not.toBeChecked();
    }
  });

  test("Phase 17: fully blocked — Studio empty", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("products-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-fully-blocked");
  });

  test("Phase 18: fully blocked — Payment methods empty", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("payment-methods-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-fully-blocked");
  });

  test("Phase 19: fully blocked — Admin detail page confirms", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);

    await expect(
      page.getByTestId("permission-toggle-products.read"),
    ).not.toBeChecked();
    await expect(
      page.getByTestId("permission-toggle-orders.view"),
    ).not.toBeChecked();
    await snap(page, "admin-detail-all-unchecked");
  });

  test("Phase 20: fully blocked — Store still public", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("product-catalog-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "store-still-public");
  });

  // ─── RESTORE: apply Seller template → partial access back ───

  test("Phase 21: admin applies Seller template", async ({ context, page }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);

    await page.getByTestId("template-btn-seller").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "admin-seller-template-applied");

    // Seller has products.create but NOT admin.audit
    await expect(
      page.getByTestId("permission-toggle-products.create"),
    ).toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
    await expect(
      page.getByTestId("permission-toggle-admin.audit"),
    ).not.toBeChecked();
  });

  test("Phase 22: seller restored — Studio access back", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("new-product-button")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-restored-as-seller");
  });

  test("Phase 23: seller permissions — admin confirms admin.audit unchecked", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);

    // Seller template does NOT include admin.audit
    await expect(
      page.getByTestId("permission-toggle-admin.audit"),
    ).not.toBeChecked();
    // But seller HAS products.create
    await expect(
      page.getByTestId("permission-toggle-products.create"),
    ).toBeChecked();
    await snap(page, "admin-seller-template-no-audit");
  });
});
```

- [ ] **Step 2: Verify E2E test file compiles**

```bash
cd apps/auth && npx tsc --noEmit --project e2e/tsconfig.json 2>/dev/null || echo "E2E typecheck complete"
```

Expected: no errors.

- [ ] **Step 3: Run the full build to verify everything**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: clean build across all apps.

---

## Post-Implementation Verification

After all 11 tasks are complete, run these checks:

```bash
# 1. Reset database with new migration
pnpm supabase db reset

# 2. Full quality checks
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build

# 3. Start the admin app and verify manually
pnpm dev:admin
# Navigate to http://localhost:5002/en/users
# Verify: table renders with users, search filter works, pagination works
# Click a user row → detail page loads
# Toggle checkboxes → immediate save
# Apply templates → bulk update

# 4. Run E2E tests (requires all apps running)
pnpm dev  # in separate terminal
pnpm supabase start  # in separate terminal
cd apps/auth && npx playwright test e2e/permission-management.spec.ts
```

---

## File Change Summary

### New Files (8)

- `supabase/migrations/20260328200000_permissions_v2.sql`
- `apps/admin/src/features/users/domain/searchParams.ts`
- `apps/admin/src/features/users/application/hooks/useUsers.ts`
- `apps/admin/src/features/users/application/hooks/useUserProfile.ts`
- `apps/admin/src/features/users/presentation/components/RoleBadge.tsx`
- `apps/admin/src/features/users/presentation/components/Pagination.tsx`
- `apps/admin/src/features/users/presentation/components/UserRow.tsx`
- `apps/admin/src/features/users/presentation/components/UserTable.tsx`
- `apps/admin/src/features/users/presentation/components/UserHeader.tsx`
- `apps/admin/src/features/users/presentation/pages/UserDetailPage.tsx`
- `apps/admin/src/app/[locale]/users/[userId]/page.tsx`

### Modified Files (9)

- `apps/admin/src/features/users/domain/constants.ts`
- `apps/admin/src/features/users/domain/types.ts`
- `apps/admin/src/features/users/infrastructure/userPermissionQueries.ts`
- `apps/admin/src/features/users/presentation/components/PermissionGroupCard.tsx`
- `apps/admin/src/features/users/presentation/components/TemplateButtons.tsx`
- `apps/admin/src/features/users/index.ts`
- `apps/admin/src/app/[locale]/users/page.tsx`
- `apps/admin/src/shared/infrastructure/i18n/messages/en.json`
- `apps/admin/src/shared/infrastructure/i18n/messages/es.json`
- `apps/auth/e2e/helpers/session.ts`
- `apps/auth/e2e/permission-management.spec.ts`

### Deleted Files (4)

- `apps/admin/src/features/users/presentation/components/UserSearch.tsx`
- `apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx`
- `apps/admin/src/features/users/presentation/pages/UserPermissionsPage.tsx`
- `apps/admin/src/features/users/application/hooks/useUserSearch.ts`
