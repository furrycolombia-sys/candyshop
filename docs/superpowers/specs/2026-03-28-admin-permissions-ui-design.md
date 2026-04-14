# Admin Permissions UI + E2E Tests (Sub-project 2 of 3)

## Goal

Build an admin page for managing user permissions with granular CRUD checkboxes, template presets, and dependency warnings. E2E test the full grant/revoke loop including RLS enforcement verification.

## Route & Navigation

New page: `/[locale]/users` in the admin app.

Admin sidebar gets a new item in a "Users" section:

```
Users
  └── User Permissions    /users
```

The page itself is permission-gated:

- Viewing requires `user_permissions.read`
- Modifying requires `user_permissions.create` + `user_permissions.update` + `user_permissions.delete`

## Page Layout

### User Search

Top of page: search input that queries `user_profiles` by email (debounced). Shows matching users as cards below.

### Permission Panel (per user)

When a user is selected, their full permission grid appears:

```
john@example.com
[Apply: Buyer] [Apply: Seller] [Apply: Admin] [Apply: None]

PRODUCTS & COMMERCE
  ☑ products.create    ☑ products.read    ☑ products.update    ☑ products.delete
  ☑ product_images.create    ☑ product_images.read    ☑ product_images.delete
  ☑ product_reviews.create   ☑ product_reviews.read   ☑ product_reviews.update   ☑ product_reviews.delete

ORDERS & PAYMENTS
  ☑ orders.create    ☑ orders.read    ☐ orders.update
  ☑ receipts.create  ☑ receipts.read  ☐ receipts.delete

SELLER CONFIGURATION
  ☐ seller_payment_methods.create  ☐ seller_payment_methods.read  ☐ seller_payment_methods.update  ☐ seller_payment_methods.delete
  ⚠ Depends on products.create

ADMIN — PLATFORM
  ☐ payment_method_types.create  ☐ payment_method_types.read  ☐ payment_method_types.update  ☐ payment_method_types.delete
  ☐ payment_settings.read  ☐ payment_settings.update
  ☐ templates.create  ☑ templates.read  ☐ templates.update  ☐ templates.delete

ADMIN — USERS & AUDIT
  ☐ audit.read
  ☐ user_permissions.create  ☐ user_permissions.read  ☐ user_permissions.update  ☐ user_permissions.delete

EVENTS & CHECK-INS
  ☐ events.create  ☐ events.read  ☐ events.update  ☐ events.delete
  ☐ check_ins.create  ☐ check_ins.read  ☐ check_ins.update
```

### Behaviors

- **Immediate save**: Each checkbox toggle immediately inserts or deletes a `user_permissions` row. No save button.
- **Optimistic UI**: Checkbox toggles instantly, reverts on error.
- **Dependency warnings**: When a child permission is granted but its `depends_on` parent isn't, show an inline warning. Warnings are informational only — they don't block the action.
- **Template buttons**: "Apply Buyer/Seller/Admin/None" bulk-replaces all permissions for the user. "None" deletes all grants.

## Permission Groups

Permissions are grouped for display. The groups and their order:

```typescript
const PERMISSION_GROUPS = [
  {
    key: "products",
    labelKey: "productsCommerce",
    permissions: [
      "products.create",
      "products.read",
      "products.update",
      "products.delete",
      "product_images.create",
      "product_images.read",
      "product_images.delete",
      "product_reviews.create",
      "product_reviews.read",
      "product_reviews.update",
      "product_reviews.delete",
    ],
  },
  {
    key: "orders",
    labelKey: "ordersPayments",
    permissions: [
      "orders.create",
      "orders.read",
      "orders.update",
      "receipts.create",
      "receipts.read",
      "receipts.delete",
    ],
  },
  {
    key: "seller",
    labelKey: "sellerConfig",
    permissions: [
      "seller_payment_methods.create",
      "seller_payment_methods.read",
      "seller_payment_methods.update",
      "seller_payment_methods.delete",
    ],
  },
  {
    key: "admin_platform",
    labelKey: "adminPlatform",
    permissions: [
      "payment_method_types.create",
      "payment_method_types.read",
      "payment_method_types.update",
      "payment_method_types.delete",
      "payment_settings.read",
      "payment_settings.update",
      "templates.create",
      "templates.read",
      "templates.update",
      "templates.delete",
    ],
  },
  {
    key: "admin_users",
    labelKey: "adminUsersAudit",
    permissions: [
      "audit.read",
      "user_permissions.create",
      "user_permissions.read",
      "user_permissions.update",
      "user_permissions.delete",
    ],
  },
  {
    key: "events",
    labelKey: "eventsCheckins",
    permissions: [
      "events.create",
      "events.read",
      "events.update",
      "events.delete",
      "check_ins.create",
      "check_ins.read",
      "check_ins.update",
    ],
  },
];
```

## Template Definitions (Client-Side Constants)

```typescript
const PERMISSION_TEMPLATES = {
  buyer: BUYER_PERMISSIONS, // from session.ts
  seller: SELLER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  none: [],
};
```

Applying a template:

1. Delete all existing `user_permissions` rows for the target user
2. Insert new rows for each permission in the template
3. Refetch the user's permissions

## Feature Architecture

```
apps/admin/src/features/users/
├── domain/
│   ├── types.ts              — UserPermissionRow, PermissionGroup
│   └── constants.ts          — PERMISSION_GROUPS, PERMISSION_TEMPLATES
├── application/
│   └── hooks/
│       ├── useUserSearch.ts           — search users by email
│       ├── useUserPermissions.ts      — get all permissions for a user
│       └── useTogglePermission.ts     — grant/revoke single permission
├── infrastructure/
│   └── userPermissionQueries.ts       — Supabase queries (search, get, grant, revoke, bulk)
└── presentation/
    ├── components/
    │   ├── UserSearch.tsx              — debounced search input
    │   ├── UserPermissionPanel.tsx     — full permission grid for one user
    │   ├── PermissionGroupCard.tsx     — one group with C/R/U/D checkboxes
    │   └── TemplateButtons.tsx         — Buyer/Seller/Admin/None buttons
    └── pages/
        └── UserPermissionsPage.tsx     — the main page
```

## Infrastructure Queries

```typescript
// Search users by email
async function searchUsers(supabase, query: string): Promise<UserProfile[]>;
// Fetches from user_profiles where email ilike %query%

// Get all permissions for a user
async function getUserPermissions(supabase, userId: string): Promise<string[]>;
// Joins user_permissions → resource_permissions → permissions
// Returns array of permission keys that are granted (not denied, not expired)

// Grant a single permission
async function grantPermission(
  supabase,
  userId: string,
  permissionKey: string,
): Promise<void>;
// Inserts into user_permissions with mode='grant', granted_by=auth.uid()

// Revoke a single permission
async function revokePermission(
  supabase,
  userId: string,
  permissionKey: string,
): Promise<void>;
// Deletes from user_permissions where user_id and permission key match

// Apply template (bulk)
async function applyTemplate(
  supabase,
  userId: string,
  permissionKeys: string[],
): Promise<void>;
// Deletes all user_permissions for user, then inserts the template keys
```

## Admin Sidebar Update

Add to `AdminSidebar.tsx` nav sections:

```typescript
{
  labelKey: "users" as const,
  items: [
    { key: "userPermissions" as const, href: "/users", icon: Shield },
  ],
}
```

## i18n Keys

### English (in admin app's en.json)

```json
"sidebar": {
  "users": "Users",
  "userPermissions": "User Permissions"
},
"userPermissions": {
  "title": "User Permissions",
  "subtitle": "Manage granular access control for each user",
  "searchPlaceholder": "Search by email...",
  "noResults": "No users found",
  "selectUser": "Search for a user to manage their permissions",
  "productsCommerce": "Products & Commerce",
  "ordersPayments": "Orders & Payments",
  "sellerConfig": "Seller Configuration",
  "adminPlatform": "Admin — Platform",
  "adminUsersAudit": "Admin — Users & Audit",
  "eventsCheckins": "Events & Check-ins",
  "applyTemplate": "Apply Template",
  "templateBuyer": "Buyer",
  "templateSeller": "Seller",
  "templateAdmin": "Admin",
  "templateNone": "None",
  "dependsOn": "Depends on {permission}",
  "dependencyWarning": "This user doesn't have {permission} — this permission may not be useful",
  "granted": "Granted",
  "revoked": "Revoked",
  "permissionUpdated": "Permission updated"
}
```

### Spanish (in admin app's es.json)

```json
"sidebar": {
  "users": "Usuarios",
  "userPermissions": "Permisos de Usuario"
},
"userPermissions": {
  "title": "Permisos de Usuario",
  "subtitle": "Gestiona el control de acceso granular para cada usuario",
  "searchPlaceholder": "Buscar por email...",
  "noResults": "No se encontraron usuarios",
  "selectUser": "Busca un usuario para gestionar sus permisos",
  "productsCommerce": "Productos y Comercio",
  "ordersPayments": "Pedidos y Pagos",
  "sellerConfig": "Configuracion de Vendedor",
  "adminPlatform": "Admin — Plataforma",
  "adminUsersAudit": "Admin — Usuarios y Auditoria",
  "eventsCheckins": "Eventos y Check-ins",
  "applyTemplate": "Aplicar Plantilla",
  "templateBuyer": "Comprador",
  "templateSeller": "Vendedor",
  "templateAdmin": "Admin",
  "templateNone": "Ninguno",
  "dependsOn": "Depende de {permission}",
  "dependencyWarning": "Este usuario no tiene {permission} — este permiso podria no ser util",
  "granted": "Otorgado",
  "revoked": "Revocado",
  "permissionUpdated": "Permiso actualizado"
}
```

## E2E Test

### File: `apps/auth/e2e/permission-management.spec.ts`

### Test Flow

```
Phase 1: Setup
  - Create admin user with ADMIN_PERMISSIONS
  - Create target user with BUYER_PERMISSIONS

Phase 2: Admin views target user's permissions
  - Admin opens admin app → /en/users
  - Searches for target user by email
  - Sees permission grid with buyer permissions checked

Phase 3: Admin grants seller permission
  - Admin checks "products.create" checkbox
  - Verifies checkbox is now checked (immediate save)

Phase 4: Verify target user can now create products
  - Switch to target user session
  - Navigate to Studio → try creating a product
  - Should succeed (has products.create)

Phase 5: Admin revokes orders.create
  - Switch back to admin
  - Uncheck "orders.create" checkbox

Phase 6: Verify target user can't checkout
  - Switch to target user
  - Navigate to Store → add to cart → checkout
  - Should fail (no orders.create permission — checkout blocked by RLS)

Phase 7: Admin applies "None" template
  - Switch back to admin
  - Click "None" template button
  - All checkboxes should be unchecked

Phase 8: Verify target user is fully blocked
  - Switch to target user
  - Navigate to Store → products should still be visible (public read)
  - But Studio should show no products (can't create)
  - Payments should show no orders (can't read own orders)
```

## Files Summary

### New files

- `apps/admin/src/features/users/` — entire feature (domain, application, infrastructure, presentation)
- `apps/admin/src/app/[locale]/users/page.tsx` — route wrapper
- `apps/auth/e2e/permission-management.spec.ts` — E2E test

### Modified files

- `apps/admin/src/shared/presentation/components/AdminSidebar.tsx` — add Users nav item
- `apps/admin/src/shared/infrastructure/i18n/messages/en.json` — add i18n keys
- `apps/admin/src/shared/infrastructure/i18n/messages/es.json` — add i18n keys

## Testing

### E2E

- Full grant/revoke flow with RLS enforcement verification
- Template application (bulk permission set)
- Permission-gated access to the permissions page itself

### Unit Tests

- `UserSearch.test.tsx` — renders search, debounces input
- `PermissionGroupCard.test.tsx` — renders checkboxes, shows warnings
- `TemplateButtons.test.tsx` — calls bulk apply handler
- `useTogglePermission.test.tsx` — grant/revoke mutations
