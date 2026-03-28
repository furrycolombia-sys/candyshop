# CRUD Permissions Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRUD-based granular permissions with `has_permission()` helper, seed 42 permission keys, and replace all RLS policies with permission-checked versions.

**Architecture:** One large SQL migration that: (1) adds `depends_on` to permissions table, (2) creates `has_permission()` function, (3) seeds the full permission catalog, (4) drops all existing RLS policies and recreates them with permission checks. E2E test helpers updated to grant permissions to test users.

**Tech Stack:** PostgreSQL, Supabase RLS, Playwright (E2E)

---

## File Structure

### New files

| File                                                      | Responsibility                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/migrations/20260328100000_crud_permissions.sql` | The permission migration — catalog, helper function, RLS policies |

### Modified files

| File                               | Change                                        |
| ---------------------------------- | --------------------------------------------- |
| `apps/auth/e2e/helpers/session.ts` | Grant permissions to test users via admin API |

---

### Task 1: Create the permissions migration

**Files:**

- Create: `supabase/migrations/20260328100000_crud_permissions.sql`

This is the core task — one migration file that does everything.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260328100000_crud_permissions.sql` with the complete SQL. The migration has 5 sections:

**Section A:** Add `depends_on` column to permissions table
**Section B:** Create `has_permission()` function
**Section C:** Seed the 42 permission keys + resource_permissions
**Section D:** Drop all existing RLS policies and recreate with permission checks
**Section E:** Grant all permissions to existing users (dev bootstrap)

The full SQL is large — the implementer must read the spec at `docs/superpowers/specs/2026-03-28-permissions-model-design.md` for the complete permission catalog and RLS policy definitions. The key patterns:

```sql
-- Section A: Add depends_on
alter table public.permissions add column if not exists depends_on text;

-- Section B: has_permission() function
create or replace function public.has_permission(
  p_user_id uuid,
  p_permission_key text
) returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'grant'
      and (up.expires_at is null or up.expires_at > now())
  )
  and not exists (
    select 1 from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'deny'
      and (up.expires_at is null or up.expires_at > now())
  );
$$;

-- Section C: Seed permissions (42 keys)
-- Pattern: insert permission, then insert resource_permission with global scope
insert into public.permissions (key, name_en, name_es, description_en, description_es, depends_on) values
  ('products.create', 'Create Products', 'Crear Productos', 'Can create new products', 'Puede crear nuevos productos', null),
  ('products.read', 'View Products', 'Ver Productos', 'Can browse and view products', 'Puede explorar y ver productos', null),
  ('products.update', 'Edit Products', 'Editar Productos', 'Can edit own products', 'Puede editar sus propios productos', 'products.create'),
  ('products.delete', 'Delete Products', 'Eliminar Productos', 'Can delete own products', 'Puede eliminar sus propios productos', 'products.create'),
  -- ... all 42 keys (see spec for complete list)
on conflict (key) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  depends_on = excluded.depends_on;

-- Create resource_permissions for each (global scope)
insert into public.resource_permissions (permission_id, resource_type, resource_id)
select p.id, 'global', null
from public.permissions p
where not exists (
  select 1 from public.resource_permissions rp
  where rp.permission_id = p.id and rp.resource_type = 'global' and rp.resource_id is null
);

-- Section D: Drop and recreate RLS policies
-- Pattern for each table:
-- 1. Drop old policies
-- 2. Create new policies with has_permission() checks

-- Example: products table
drop policy if exists "products_public_read" on public.products;
drop policy if exists "products_auth_insert" on public.products;
drop policy if exists "products_auth_update" on public.products;
drop policy if exists "products_auth_delete" on public.products;
drop policy if exists "Products: insert own" on public.products;
drop policy if exists "Products: update own" on public.products;
drop policy if exists "Products: delete own" on public.products;

create policy "products_read" on public.products
  for select using (true); -- products are public

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

-- Section E: Bootstrap — grant all permissions to existing users (dev only)
-- This ensures local dev doesn't break after migration
do $$
declare
  v_user record;
  v_rp record;
begin
  for v_user in (select id from auth.users) loop
    for v_rp in (
      select rp.id from public.resource_permissions rp
      where rp.resource_type = 'global'
    ) loop
      insert into public.user_permissions (user_id, resource_permission_id, mode, granted_by, reason)
      values (v_user.id, v_rp.id, 'grant', v_user.id, 'Bootstrap: dev migration')
      on conflict (user_id, resource_permission_id) do nothing;
    end loop;
  end loop;
end;
$$;
```

The implementer must write the FULL migration covering ALL tables listed in the spec:

- products, product_entitlements, product_reviews, product_templates
- orders, order_items
- seller_payment_methods, payment_method_types, payment_settings
- check_ins, check_in_audit, ticket_transfers
- user_permissions, permissions, resource_permissions
- user_profiles (keep existing ownership policies)
- audit.logged_actions (use has_permission for audit.read)
- storage.objects (receipts bucket, product-images bucket)

- [ ] **Step 2: Apply the migration locally**

```bash
docker exec -i supabase_db_candystore psql -U postgres -d postgres < supabase/migrations/20260328100000_crud_permissions.sql
```

Expected: No errors. All policies recreated.

- [ ] **Step 3: Verify has_permission() works**

```bash
docker exec -i supabase_db_candystore psql -U postgres -d postgres -c "
  select has_permission(
    (select id from auth.users limit 1),
    'products.create'
  );
"
```

Expected: `t` (true) — because Section E granted all permissions to existing users.

- [ ] **Step 4: Verify permission catalog was seeded**

```bash
docker exec -i supabase_db_candystore psql -U postgres -d postgres -c "
  select count(*) from public.permissions;
  select count(*) from public.resource_permissions where resource_type = 'global';
"
```

Expected: 42 permissions, 42 resource_permissions.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260328100000_crud_permissions.sql
git commit -m "feat(db): CRUD permissions — 42 keys, has_permission(), RLS policies"
```

---

### Task 2: Update E2E helpers to grant permissions to test users

**Files:**

- Modify: `apps/auth/e2e/helpers/session.ts`

- [ ] **Step 1: Add a `grantPermissions()` helper**

After `createTestUser()`, add a function that grants a set of permission keys to a user via the admin REST API:

```typescript
/**
 * Grant a list of permission keys to a user via admin REST API.
 * Uses the global resource_permissions (resource_type = 'global').
 */
export async function grantPermissions(
  userId: string,
  permissionKeys: string[],
): Promise<void> {
  // Get all global resource_permissions with their permission keys
  const allRps = await adminQuery(
    "resource_permissions",
    "resource_type=eq.global&select=id,permission_id,permissions!inner(key)",
  );

  for (const key of permissionKeys) {
    const rp = allRps.find(
      (r: Record<string, unknown>) =>
        (r.permissions as Record<string, unknown>).key === key,
    );
    if (!rp) continue;

    await adminInsert("user_permissions", {
      user_id: userId,
      resource_permission_id: rp.id,
      mode: "grant",
      granted_by: userId,
      reason: "E2E test setup",
    });
  }
}
```

Also add permission key constants for the common templates:

```typescript
export const BUYER_PERMISSIONS = [
  "products.read",
  "orders.create",
  "orders.read",
  "receipts.create",
  "receipts.read",
  "product_reviews.create",
  "product_reviews.read",
  "product_reviews.update",
  "product_reviews.delete",
];

export const SELLER_PERMISSIONS = [
  ...BUYER_PERMISSIONS,
  "products.create",
  "products.update",
  "products.delete",
  "product_images.create",
  "product_images.read",
  "product_images.delete",
  "seller_payment_methods.create",
  "seller_payment_methods.read",
  "seller_payment_methods.update",
  "seller_payment_methods.delete",
  "orders.update",
  "templates.read",
];
```

- [ ] **Step 2: Update `createTestUser()` to accept a permissions parameter**

Modify `createTestUser` signature:

```typescript
export async function createTestUser(
  label: string,
  permissions: string[] = [],
): Promise<TestUser> {
  // ... existing user creation code ...

  // Grant permissions if provided
  if (permissions.length > 0) {
    await grantPermissions(user.user!.id, permissions);
  }

  return { userId: user.user!.id, email, accessToken, refreshToken };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/auth/e2e/helpers/session.ts
git commit -m "feat(e2e): add grantPermissions helper and permission templates"
```

---

### Task 3: Update E2E test to grant permissions to test users

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts`

- [ ] **Step 1: Import and use permission templates**

Update the `beforeAll` in the E2E test to grant seller permissions to the seller user and buyer permissions to the buyer user:

Find:

```typescript
seller = await createTestUser("seller");
buyer = await createTestUser("buyer");
```

Replace with:

```typescript
seller = await createTestUser("seller", SELLER_PERMISSIONS);
buyer = await createTestUser("buyer", BUYER_PERMISSIONS);
```

And add the import:

```typescript
import {
  createTestUser,
  injectSession,
  SELLER_PERMISSIONS,
  BUYER_PERMISSIONS,
  type TestUser,
} from "./helpers/session";
```

- [ ] **Step 2: Run E2E to verify permissions work**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --timeout 120000
```

Expected: All 6 phases pass — the permission grants enable all the CRUD operations the test needs.

- [ ] **Step 3: Commit**

```bash
git add apps/auth/e2e/full-purchase-flow.spec.ts
git commit -m "test(e2e): grant CRUD permissions to test users"
```

---

### Task 4: Update E2E cleanup to remove permissions

**Files:**

- Modify: `apps/auth/e2e/helpers/cleanup.ts`

- [ ] **Step 1: Add user_permissions deletion to cleanup**

In `cleanupTestData()`, add deletion of user permissions BEFORE deleting users (FK constraint):

After the order cleanup and before "Delete both users", add:

```typescript
// Delete user permissions
await adminDelete("user_permissions", `user_id=eq.${sellerUserId}`);
await adminDelete("user_permissions", `user_id=eq.${buyerUserId}`);
```

- [ ] **Step 2: Run E2E to verify cleanup works**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --timeout 120000
```

Expected: All 6 phases pass and cleanup runs without FK errors.

- [ ] **Step 3: Commit**

```bash
git add apps/auth/e2e/helpers/cleanup.ts
git commit -m "fix(e2e): clean up user permissions in test teardown"
```

---

### Task 5: Verify everything works end-to-end

- [ ] **Step 1: Run unit tests**

```bash
pnpm test
```

Expected: All pass.

- [ ] **Step 2: Run E2E headed**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed --timeout 120000
```

Expected: All 6 phases pass with the new permission-gated RLS.

- [ ] **Step 3: Verify a user WITHOUT permissions is blocked**

Quick manual test via psql:

```bash
docker exec -i supabase_db_candystore psql -U postgres -d postgres -c "
  -- Create a user with NO permissions and verify they can't insert products
  select has_permission('00000000-0000-0000-0000-000000000000', 'products.create');
"
```

Expected: `f` (false) — a non-existent user has no permissions.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve permission enforcement issues"
```
