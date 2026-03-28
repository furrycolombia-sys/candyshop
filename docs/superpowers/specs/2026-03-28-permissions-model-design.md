# Permissions Model — CRUD Granular Control (Sub-project 1 of 3)

## Goal

Redesign the permission system to be fully CRUD-based and granular. Every resource gets Create/Read/Update/Delete permissions that can be individually toggled per user. No roles in the database — only individual permission grants. Admin UI will offer templates as a convenience for bulk-applying common permission sets.

## Scope

This sub-project covers:

- Permission catalog (all CRUD permission keys)
- Database migration (seed the catalog, create `has_permission()` helper)
- RLS policies (enforce permissions on every table)
- Tighten all existing "TODO: GH-11" gaps

NOT in scope (separate sub-projects):

- Admin panel UI for managing permissions
- Client-side `usePermission()` hook and route guards

## Permission Catalog

Every resource gets up to 4 operations. Each is a distinct permission key stored in the `permissions` table.

### Products & Commerce

| Key                      | Description                   | Who typically has it |
| ------------------------ | ----------------------------- | -------------------- |
| `products.create`        | Create new products in Studio | Sellers              |
| `products.read`          | Browse and view products      | Everyone             |
| `products.update`        | Edit own products             | Sellers              |
| `products.delete`        | Delete own products           | Sellers              |
| `product_images.create`  | Upload product images         | Sellers              |
| `product_images.read`    | View product images           | Everyone             |
| `product_images.delete`  | Delete product images         | Sellers (own)        |
| `product_reviews.create` | Write reviews                 | Buyers               |
| `product_reviews.read`   | Read reviews                  | Everyone             |
| `product_reviews.update` | Edit own review               | Buyers (own)         |
| `product_reviews.delete` | Delete own review             | Buyers (own)         |

### Orders & Payments

| Key               | Description                       | Who typically has it |
| ----------------- | --------------------------------- | -------------------- |
| `orders.create`   | Place orders (checkout)           | Buyers               |
| `orders.read`     | View own orders / received orders | Buyers + Sellers     |
| `orders.update`   | Approve/reject orders (via RPC)   | Sellers              |
| `receipts.create` | Upload payment receipts           | Buyers               |
| `receipts.read`   | View receipts                     | Buyers + Sellers     |
| `receipts.delete` | Delete own receipts               | Buyers               |

### Seller Configuration

| Key                             | Description              | Who typically has it |
| ------------------------------- | ------------------------ | -------------------- |
| `seller_payment_methods.create` | Add payment methods      | Sellers              |
| `seller_payment_methods.read`   | View own payment methods | Sellers              |
| `seller_payment_methods.update` | Edit payment methods     | Sellers              |
| `seller_payment_methods.delete` | Remove payment methods   | Sellers              |

### Admin — Platform Configuration

| Key                           | Description                         | Who typically has it |
| ----------------------------- | ----------------------------------- | -------------------- |
| `payment_method_types.create` | Create payment type catalog entries | Admins               |
| `payment_method_types.read`   | View payment types                  | Everyone             |
| `payment_method_types.update` | Edit payment types                  | Admins               |
| `payment_method_types.delete` | Delete payment types                | Admins               |
| `payment_settings.read`       | View timeout settings               | Admins               |
| `payment_settings.update`     | Change timeout settings             | Admins               |
| `templates.create`            | Create product templates            | Admins               |
| `templates.read`              | View templates                      | Sellers              |
| `templates.update`            | Edit templates                      | Admins               |
| `templates.delete`            | Delete templates                    | Admins               |

### Admin — User & Audit Management

| Key                       | Description                | Who typically has it |
| ------------------------- | -------------------------- | -------------------- |
| `audit.read`              | View audit log             | Admins               |
| `user_permissions.create` | Grant permissions to users | Admins               |
| `user_permissions.read`   | View user permissions      | Admins               |
| `user_permissions.update` | Modify permission grants   | Admins               |
| `user_permissions.delete` | Revoke permissions         | Admins               |

### Events & Check-ins (future, seeded now)

| Key                | Description          | Who typically has it |
| ------------------ | -------------------- | -------------------- |
| `events.create`    | Create events        | Admins               |
| `events.read`      | View events          | Everyone             |
| `events.update`    | Edit events          | Admins               |
| `events.delete`    | Delete events        | Admins               |
| `check_ins.create` | Check in attendees   | Staff                |
| `check_ins.read`   | View check-in status | Attendees + Staff    |
| `check_ins.update` | Undo check-in        | Staff                |

**Total: 42 permission keys**

## Database Changes

### 1. `has_permission()` Helper Function

A reusable SQL function that RLS policies call to check if a user has a specific permission:

```sql
create or replace function public.has_permission(
  p_user_id uuid,
  p_permission_key text
) returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'grant'
      and (up.expires_at is null or up.expires_at > now())
  )
  -- Check no explicit deny exists (deny always wins)
  and not exists (
    select 1
    from public.user_permissions up
    inner join public.resource_permissions rp on rp.id = up.resource_permission_id
    inner join public.permissions p on p.id = rp.permission_id
    where up.user_id = p_user_id
      and p.key = p_permission_key
      and up.mode = 'deny'
      and (up.expires_at is null or up.expires_at > now())
  );
$$;
```

This function:

- Checks for an active `grant` for the permission key
- Checks for no active `deny` (deny always wins over grant)
- Respects expiration dates
- Is `security definer` so it runs with elevated privileges
- Is `stable` so PostgreSQL can cache results within a transaction

### 2. Seed the Permission Catalog

Insert all 42 permission keys into the `permissions` table, then create matching `resource_permissions` entries with global scope (`resource_type = 'global'`, `resource_id = null`).

### 3. RLS Policy Updates

Replace existing permissive policies with permission-checked ones. Pattern:

```sql
-- Before (too permissive):
create policy "products_auth_insert" on products
  for insert with check (auth.role() = 'authenticated');

-- After (permission-checked + ownership):
create policy "products_auth_insert" on products
  for insert with check (
    has_permission(auth.uid(), 'products.create')
    and seller_id = auth.uid()
  );
```

Every table gets updated policies:

**Products:**

- `select`: `has_permission(auth.uid(), 'products.read')` OR public (is_active = true)
- `insert`: `has_permission(auth.uid(), 'products.create')` AND `seller_id = auth.uid()`
- `update`: `has_permission(auth.uid(), 'products.update')` AND `seller_id = auth.uid()`
- `delete`: `has_permission(auth.uid(), 'products.delete')` AND `seller_id = auth.uid()`

**Orders:**

- `select`: `has_permission(auth.uid(), 'orders.read')` AND (`user_id = auth.uid()` OR `seller_id = auth.uid()`)
- `insert`: `has_permission(auth.uid(), 'orders.create')` AND `user_id = auth.uid()`
- `update` (buyer): `has_permission(auth.uid(), 'orders.create')` AND `user_id = auth.uid()` (resubmit evidence)
- `update` (seller): `has_permission(auth.uid(), 'orders.update')` AND `seller_id = auth.uid()` (approve/reject)

**Seller Payment Methods:**

- `select`: `true` (public read for checkout)
- `insert`: `has_permission(auth.uid(), 'seller_payment_methods.create')` AND `seller_id = auth.uid()`
- `update`: `has_permission(auth.uid(), 'seller_payment_methods.update')` AND `seller_id = auth.uid()`
- `delete`: `has_permission(auth.uid(), 'seller_payment_methods.delete')` AND `seller_id = auth.uid()`

**Admin Tables** (payment_method_types, templates, payment_settings):

- `select`: `true` (public read)
- `insert/update/delete`: `has_permission(auth.uid(), '{table}.create/update/delete')`

**Audit:**

- `select`: `has_permission(auth.uid(), 'audit.read')`

**User Permissions:**

- `select`: `has_permission(auth.uid(), 'user_permissions.read')` OR `user_id = auth.uid()` (users can see their own)
- `insert`: `has_permission(auth.uid(), 'user_permissions.create')`
- `update`: `has_permission(auth.uid(), 'user_permissions.update')`
- `delete`: `has_permission(auth.uid(), 'user_permissions.delete')`

### 4. Bootstrap Admin User

After seeding, the first admin needs permissions. The migration will grant all permissions to a bootstrap admin. This is done via a Supabase SQL migration that:

1. Finds the first user in `auth.users` (or a configured admin email from env)
2. Grants all `user_permissions.*` and `audit.read` permissions to bootstrap the system

For local dev, the migration grants all permissions to every existing user (so dev doesn't break). In production, this would be a one-time manual grant.

### 5. Soft Dependency Warnings

The `permissions` table gets a new `depends_on` column (nullable text, stores the parent permission key). This is metadata only — not enforced by RLS. The admin UI reads it to show warnings:

```sql
alter table public.permissions add column depends_on text;

-- Example: seller_payment_methods.create depends on products.create
update permissions set depends_on = 'products.create'
  where key like 'seller_payment_methods.%';
```

Dependencies (for admin UI warnings):

- `seller_payment_methods.*` depends on `products.create`
- `orders.update` (seller approve) depends on `products.create`
- `receipts.create` depends on `orders.create`
- `product_images.*` depends on `products.create`
- `product_reviews.create` depends on `orders.create`

## Template Definitions (Client-Side Only)

Not in database. Stored as a constant in the admin app:

```typescript
const PERMISSION_TEMPLATES = {
  buyer: [
    "products.read",
    "orders.create",
    "orders.read",
    "receipts.create",
    "receipts.read",
    "product_reviews.create",
    "product_reviews.read",
    "product_reviews.update",
    "product_reviews.delete",
  ],
  seller: [
    // includes all buyer permissions plus:
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
    "orders.update", // approve/reject
    "templates.read",
  ],
  admin: [
    // includes all seller permissions plus:
    "audit.read",
    "payment_method_types.create",
    "payment_method_types.read",
    "payment_method_types.update",
    "payment_method_types.delete",
    "payment_settings.read",
    "payment_settings.update",
    "templates.create",
    "templates.update",
    "templates.delete",
    "user_permissions.create",
    "user_permissions.read",
    "user_permissions.update",
    "user_permissions.delete",
    "events.create",
    "events.read",
    "events.update",
    "events.delete",
  ],
} as const;
```

## Migration File

One new migration: `20260328100000_crud_permissions.sql`

This migration:

1. Adds `depends_on` column to `permissions` table
2. Inserts all 42 permission keys
3. Creates `resource_permissions` entries (global scope)
4. Creates `has_permission()` function
5. Drops and recreates all RLS policies with permission checks
6. For local dev: grants all permissions to existing users

## Testing

- Unit test `has_permission()` function with grant, deny, expired, no-grant scenarios
- E2E: the existing full-purchase-flow test needs permission grants for the test users (seller + buyer)
- Update E2E helpers to grant appropriate permissions when creating test users

## Files Summary

### New

- `supabase/migrations/20260328100000_crud_permissions.sql` — the big migration

### Modified

- `apps/auth/e2e/helpers/session.ts` — grant permissions when creating test users
- `apps/auth/e2e/full-purchase-flow.spec.ts` — may need adjustments for permission-gated actions

### Not Modified (yet — Sub-project 2)

- Admin app components (UI for permission management)
- Client-side hooks (permission checking in React)
