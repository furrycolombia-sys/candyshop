# Permissions V2: Capability-Based Model + User Management UI

## Goal

Replace the 43 CRUD-per-table permission keys with 17 capability-based permissions, and replace the search-based user permissions page with a paginated user table + dedicated user detail page for permission editing.

## Scope

This is a single spec covering two tightly coupled changes:

1. **Backend** — New migration collapsing 43 → 17 permission keys, updated RLS policies
2. **Frontend** — User table at `/users`, user detail page at `/users/[userId]`

---

## Permission Model

### 17 Capability-Based Keys

| #   | Key                      | Covers                                     | Group    |
| --- | ------------------------ | ------------------------------------------ | -------- |
| 1   | `products.create`        | Create products + images + pricing + stock | Products |
| 2   | `products.read`          | View products in Studio                    | Products |
| 3   | `products.update`        | Edit products + images + stock + pricing   | Products |
| 4   | `products.delete`        | Delete products                            | Products |
| 5   | `reviews.write`          | Write / edit / delete own reviews          | Reviews  |
| 6   | `orders.place`           | Checkout + upload receipts                 | Orders   |
| 7   | `orders.view`            | View own orders & receipts                 | Orders   |
| 8   | `orders.manage`          | Approve / reject received orders           | Orders   |
| 9   | `seller.payment_methods` | Full CRUD on seller payment methods        | Seller   |
| 10  | `admin.payment_types`    | Manage payment type catalog                | Admin    |
| 11  | `admin.templates`        | Manage product templates                   | Admin    |
| 12  | `admin.settings`         | Manage platform settings                   | Admin    |
| 13  | `admin.audit`            | View audit log                             | Admin    |
| 14  | `admin.users`            | Manage user permissions                    | Admin    |
| 15  | `events.manage`          | Create / edit / delete events              | Events   |
| 16  | `events.read`            | View events                                | Events   |
| 17  | `checkins.manage`        | Check-in, view, undo                       | Events   |

### Design Principles

- **One permission per capability**, not per database operation
- Images, receipts, and related sub-resources fold into their parent permission
- Admin areas get a single toggle each — either you manage it or you don't
- Reviews collapse edit/delete into `reviews.write` (you can manage your own)

### Permission Groups (UI Display)

```typescript
const PERMISSION_GROUPS = [
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
```

### Permission Templates

| Template | Keys                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| Buyer    | `products.read`, `reviews.write`, `orders.place`, `orders.view`                                            |
| Seller   | Buyer + `products.create`, `products.update`, `products.delete`, `orders.manage`, `seller.payment_methods` |
| Admin    | All 17                                                                                                     |
| None     | Empty                                                                                                      |

---

## Routes & Navigation

| Route             | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `/users`          | Paginated user table with search filter           |
| `/users/[userId]` | User detail page with profile + permission editor |

Sidebar: "Users" section with "User Management" item at `/users` (Shield icon). No change to sidebar structure.

---

## User Table Page (`/users`)

### URL State (nuqs)

```typescript
// domain/searchParams.ts
const usersSearchParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};
```

All filter state lives in the URL — bookmarkable, shareable, back-button works.

### Layout

```
┌─────────────────────────────────────────────┐
│ Users                                       │
│ Manage user accounts and permissions        │
├─────────────────────────────────────────────┤
│ [🔍 Filter by email or name...          ]   │
├──────┬──────────┬──────────┬──────┬─────────┤
│ Avatar│ Email    │ Name     │ Role │ Last Seen│
├──────┼──────────┼──────────┼──────┼─────────┤
│ 🟣   │ a@b.com  │ Alice    │ Admin│ 2h ago  │
│ 🟢   │ b@c.com  │ Bob      │ Seller│ 1d ago │
│ 🔵   │ c@d.com  │ Carol    │ Buyer│ 3d ago  │
│ ⚪   │ d@e.com  │ —        │ None │ 1w ago  │
├──────┴──────────┴──────────┴──────┴─────────┤
│ Showing 1-20 of 156        [< 1 2 3 ... >]  │
└─────────────────────────────────────────────┘
```

### Table Columns

| Column       | Source                                             | Notes                                        |
| ------------ | -------------------------------------------------- | -------------------------------------------- |
| Avatar       | `user_profiles.display_avatar_url` or `avatar_url` | Fallback to initials                         |
| Email        | `user_profiles.email`                              | Primary identifier                           |
| Display Name | `user_profiles.display_name`                       | May be null — show "—"                       |
| Role         | Computed client-side                               | Match granted keys against templates → badge |
| Last Seen    | `user_profiles.last_seen_at`                       | Relative time ("2h ago")                     |

### Role Badge Logic

```typescript
function computeRole(
  grantedKeys: string[],
): "admin" | "seller" | "buyer" | "custom" | "none" {
  if (grantedKeys.length === 0) return "none";
  const sorted = [...grantedKeys].sort();
  if (arraysEqual(sorted, [...ADMIN_PERMISSIONS].sort())) return "admin";
  if (arraysEqual(sorted, [...SELLER_PERMISSIONS].sort())) return "seller";
  if (arraysEqual(sorted, [...BUYER_PERMISSIONS].sort())) return "buyer";
  return "custom";
}
```

### Behaviors

- **Server-side search**: `search` param filters `user_profiles` by email or display_name (ilike)
- **Server-side pagination**: 20 rows per page, total count for pagination controls
- **Debounced search**: 300ms debounce on filter input, `history: "replace"` (no history spam)
- **Page resets on search**: changing search resets page to 1
- **Row click**: navigates to `/users/[userId]`

### Infrastructure Query

```typescript
interface PaginatedUsers {
  users: UserProfileSummary[];
  total: number;
}

async function listUsers(
  supabase: SupabaseClient,
  search: string,
  page: number,
  perPage: number,
): Promise<PaginatedUsers>;
// Uses .range() for pagination, .or() for email/name ilike
// Returns { users, total } using { count: "exact" } option
```

---

## User Detail Page (`/users/[userId]`)

### Layout

```
┌─────────────────────────────────────────────┐
│ ← Back to Users                             │
├─────────────────────────────────────────────┤
│ 🟣 Alice Johnson                            │
│ alice@example.com                           │
│ 🔗 View Profile    Role: Admin   Seen: 2h  │
├─────────────────────────────────────────────┤
│ [Buyer] [Seller] [Admin] [None]             │
├─────────────────────────────────────────────┤
│ PRODUCTS                                    │
│ ☑ Create  ☑ Read  ☑ Update  ☑ Delete       │
├─────────────────────────────────────────────┤
│ REVIEWS                                     │
│ ☑ Write                                     │
├─────────────────────────────────────────────┤
│ ORDERS                                      │
│ ☑ Place  ☑ View  ☑ Manage                  │
├─────────────────────────────────────────────┤
│ SELLER                                      │
│ ☑ Payment Methods                           │
├─────────────────────────────────────────────┤
│ ADMIN                                       │
│ ☑ Payment Types ☑ Templates ☑ Settings     │
│ ☑ Audit         ☑ Users                    │
├─────────────────────────────────────────────┤
│ EVENTS                                      │
│ ☑ Manage Events  ☑ Read Events  ☑ Check-ins│
└─────────────────────────────────────────────┘
```

### User Header

- Avatar (large)
- Display name (or email if no name)
- Email
- Link to profile: `{AUTH_URL}/en/profile/{userId}` — opens in new tab
- Role badge (computed same as table)
- Last seen (relative time)

### Permission Editor

Same immediate-save behavior as current:

- Each checkbox toggle immediately inserts or deletes a `user_permissions` row
- Optimistic UI — checkbox toggles instantly, reverts on error
- Template buttons bulk-replace all permissions
- Groups displayed with human-readable labels from i18n

### Infrastructure Query

```typescript
async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfileSummary | null>;
// Single user fetch by ID
```

Existing `getUserPermissionKeys`, `grantPermission`, `revokePermission`, `applyTemplate` reused with updated key names.

---

## Database Migration

### Strategy

New migration file: `20260328200000_permissions_v2.sql`

1. **Delete all `user_permissions`** rows (clean slate for dev)
2. **Delete all `resource_permissions`** for old keys
3. **Delete old permission rows** (the 43 keys)
4. **Insert 17 new permission keys** with names in en/es
5. **Insert 17 global `resource_permissions`** entries
6. **Drop all RLS policies** that reference `has_permission()` with old keys
7. **Recreate RLS policies** with new keys:
   - `product_images` INSERT → checks `products.create` (not `product_images.create`)
   - `product_images` DELETE → checks `products.delete` (not `product_images.delete`)
   - `receipts` INSERT → checks `orders.place` (not `receipts.create`)
   - `receipts` SELECT → checks `orders.view` (not `receipts.read`)
   - `receipts` DELETE → checks `orders.place` (not `receipts.delete`)
   - `product_reviews` INSERT → checks `reviews.write`
   - `product_reviews` UPDATE → checks `reviews.write`
   - `product_reviews` DELETE → checks `reviews.write`
   - `orders` INSERT → checks `orders.place`
   - `orders` SELECT → checks `orders.view`
   - `orders` UPDATE → checks `orders.manage`
   - `seller_payment_methods` all ops → checks `seller.payment_methods`
   - `payment_method_types` all ops → checks `admin.payment_types`
   - `product_templates` all ops → checks `admin.templates`
   - `payment_settings` SELECT → checks `admin.settings`
   - `payment_settings` UPDATE → checks `admin.settings`
   - `audit_log` SELECT → checks `admin.audit`
   - `user_permissions` all ops → checks `admin.users`
   - `events` INSERT/UPDATE/DELETE → checks `events.manage`
   - `events` SELECT → checks `events.read`
   - `check_ins` all ops → checks `checkins.manage`
8. **Bootstrap**: grant all 17 permissions to existing dev users

### `has_permission()` function

No changes needed — the function resolves by key string, so it works with any key format.

---

## E2E Helpers Update

### Permission Templates in session.ts

```typescript
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
  "admin.settings",
  "admin.audit",
  "admin.users",
  "events.manage",
  "events.read",
  "checkins.manage",
];
```

### E2E Test Update

`permission-management.spec.ts` updated to:

- Phase 1-6: baseline across all apps (same structure)
- Phase 7+: revoke/grant using new key names
- Same screenshots, regenerated

---

## Feature Architecture

```
apps/admin/src/features/users/
├── domain/
│   ├── constants.ts          — PERMISSION_GROUPS, PERMISSION_TEMPLATES (17 keys)
│   ├── types.ts              — UserProfileSummary, PaginatedUsers
│   └── searchParams.ts       — nuqs parsers (search, page)
├── application/
│   └── hooks/
│       ├── useUsers.ts               — paginated user list query
│       ├── useUserProfile.ts         — single user profile query
│       ├── useUserPermissions.ts     — granted keys for user (existing)
│       ├── useTogglePermission.ts    — grant/revoke mutation (existing)
│       └── useApplyTemplate.ts       — bulk template mutation (existing)
├── infrastructure/
│   └── userPermissionQueries.ts      — listUsers, getUserProfile + existing queries
└── presentation/
    ├── components/
    │   ├── UserTable.tsx             — paginated table with filter
    │   ├── UserRow.tsx               — single table row
    │   ├── RoleBadge.tsx             — computed role badge
    │   ├── Pagination.tsx            — page controls
    │   ├── UserHeader.tsx            — profile info on detail page
    │   ├── PermissionGroupCard.tsx   — checkbox group (updated for 17 keys)
    │   └── TemplateButtons.tsx       — Buyer/Seller/Admin/None (existing)
    └── pages/
        ├── UsersPage.tsx             — table page (replaces UserPermissionsPage)
        └── UserDetailPage.tsx        — detail page (new)
```

---

## i18n Keys

### English (`en.json`)

```json
"users": {
  "title": "Users",
  "subtitle": "Manage user accounts and permissions",
  "searchPlaceholder": "Filter by email or name...",
  "noResults": "No users found",
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
  "pagination": {
    "showing": "Showing {from}-{to}",
    "of": "of {total}"
  },
  "detail": {
    "backToUsers": "Back to Users",
    "viewProfile": "View Profile",
    "permissionsCount": "{count, plural, one {# permission} other {# permissions}}"
  }
}
```

### Spanish (`es.json`)

```json
"users": {
  "title": "Usuarios",
  "subtitle": "Gestionar cuentas de usuario y permisos",
  "searchPlaceholder": "Filtrar por email o nombre...",
  "noResults": "No se encontraron usuarios",
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
  "pagination": {
    "showing": "Mostrando {from}-{to}",
    "of": "de {total}"
  },
  "detail": {
    "backToUsers": "Volver a Usuarios",
    "viewProfile": "Ver Perfil",
    "permissionsCount": "{count, plural, one {# permiso} other {# permisos}}"
  }
}
```

Permission labels use the permission key as the i18n key:

```json
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

---

## Files Summary

### New Files

- `supabase/migrations/20260328200000_permissions_v2.sql` — permission collapse migration
- `apps/admin/src/features/users/domain/searchParams.ts` — nuqs parsers
- `apps/admin/src/features/users/application/hooks/useUsers.ts` — paginated list
- `apps/admin/src/features/users/application/hooks/useUserProfile.ts` — single user
- `apps/admin/src/features/users/presentation/components/UserTable.tsx`
- `apps/admin/src/features/users/presentation/components/UserRow.tsx`
- `apps/admin/src/features/users/presentation/components/RoleBadge.tsx`
- `apps/admin/src/features/users/presentation/components/Pagination.tsx`
- `apps/admin/src/features/users/presentation/components/UserHeader.tsx`
- `apps/admin/src/features/users/presentation/pages/UserDetailPage.tsx`
- `apps/admin/src/app/[locale]/users/[userId]/page.tsx` — detail route

### Modified Files

- `apps/admin/src/features/users/domain/constants.ts` — 17-key groups + templates
- `apps/admin/src/features/users/domain/types.ts` — PaginatedUsers type
- `apps/admin/src/features/users/infrastructure/userPermissionQueries.ts` — add listUsers, getUserProfile
- `apps/admin/src/features/users/presentation/components/PermissionGroupCard.tsx` — updated for new keys
- `apps/admin/src/features/users/presentation/pages/UsersPage.tsx` — replace search with table (rename from UserPermissionsPage)
- `apps/admin/src/app/[locale]/users/page.tsx` — point to UsersPage
- `apps/admin/src/shared/infrastructure/i18n/messages/en.json` — new i18n keys
- `apps/admin/src/shared/infrastructure/i18n/messages/es.json` — new i18n keys
- `apps/auth/e2e/helpers/session.ts` — updated permission templates
- `apps/auth/e2e/permission-management.spec.ts` — updated key names

### Deleted Files

- `apps/admin/src/features/users/presentation/components/UserSearch.tsx` — replaced by table filter
- `apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx` — replaced by UserDetailPage
- `apps/admin/src/features/users/application/hooks/useUserSearch.ts` — replaced by useUsers
