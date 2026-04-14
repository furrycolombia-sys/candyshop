# Admin Permissions UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin page for managing user permissions with granular CRUD checkboxes, template presets, and E2E test for the full grant/revoke loop.

**Architecture:** New feature in `apps/admin/src/features/users/` following existing Clean Architecture patterns. Page queries `user_profiles` for search, `user_permissions` + `resource_permissions` + `permissions` for the permission grid. Each checkbox toggle immediately inserts/deletes a `user_permissions` row. E2E test creates admin + target user, grants/revokes permissions through the UI, and verifies RLS enforcement.

**Tech Stack:** Next.js 16, React 19, TanStack Query, Supabase, next-intl, Tailwind CSS v4, Playwright

---

## File Structure

### New files

| File                                                                            | Responsibility                  |
| ------------------------------------------------------------------------------- | ------------------------------- |
| `apps/admin/src/features/users/domain/types.ts`                                 | Types for permission management |
| `apps/admin/src/features/users/domain/constants.ts`                             | Permission groups, templates    |
| `apps/admin/src/features/users/application/hooks/useUserSearch.ts`              | Search users by email           |
| `apps/admin/src/features/users/application/hooks/useUserPermissions.ts`         | Get permissions for a user      |
| `apps/admin/src/features/users/application/hooks/useTogglePermission.ts`        | Grant/revoke mutation           |
| `apps/admin/src/features/users/infrastructure/userPermissionQueries.ts`         | Supabase queries                |
| `apps/admin/src/features/users/presentation/components/UserSearch.tsx`          | Search input                    |
| `apps/admin/src/features/users/presentation/components/PermissionGroupCard.tsx` | One group with checkboxes       |
| `apps/admin/src/features/users/presentation/components/TemplateButtons.tsx`     | Preset buttons                  |
| `apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx` | Full grid for one user          |
| `apps/admin/src/features/users/presentation/pages/UserPermissionsPage.tsx`      | Main page                       |
| `apps/admin/src/features/users/index.ts`                                        | Barrel export                   |
| `apps/admin/src/app/[locale]/users/page.tsx`                                    | Route wrapper                   |
| `apps/auth/e2e/permission-management.spec.ts`                                   | E2E test                        |

### Modified files

| File                                                             | Change             |
| ---------------------------------------------------------------- | ------------------ |
| `apps/admin/src/shared/presentation/components/AdminSidebar.tsx` | Add Users nav item |
| `apps/admin/src/shared/infrastructure/i18n/messages/en.json`     | Add i18n keys      |
| `apps/admin/src/shared/infrastructure/i18n/messages/es.json`     | Add i18n keys      |

---

### Task 1: Domain + Constants + i18n

**Files:**

- Create: `apps/admin/src/features/users/domain/types.ts`
- Create: `apps/admin/src/features/users/domain/constants.ts`
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/admin/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Create domain types**

Create `apps/admin/src/features/users/domain/types.ts` with the types the feature needs.

- [ ] **Step 2: Create constants with permission groups and templates**

Create `apps/admin/src/features/users/domain/constants.ts` with `PERMISSION_GROUPS` and `PERMISSION_TEMPLATES` as defined in the spec.

- [ ] **Step 3: Add i18n keys**

Add `sidebar.users`, `sidebar.userPermissions`, and the full `userPermissions.*` namespace to both `en.json` and `es.json` as specified in the design doc.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/users/domain/ apps/admin/src/shared/infrastructure/i18n/
git commit -m "feat(admin): add permission management domain types and i18n"
```

---

### Task 2: Infrastructure — Supabase Queries

**Files:**

- Create: `apps/admin/src/features/users/infrastructure/userPermissionQueries.ts`

- [ ] **Step 1: Write the queries**

The implementer must create 5 functions following the pattern in `apps/admin/src/features/settings/infrastructure/settingsQueries.ts`:

1. `searchUsers(supabase, query)` — queries `user_profiles` where email ilike `%query%`, returns array of profiles
2. `getUserPermissionKeys(supabase, userId)` — joins `user_permissions` → `resource_permissions` → `permissions`, returns granted permission keys as `string[]`
3. `grantPermission(supabase, userId, permissionKey)` — looks up the resource_permission ID for the key, inserts into `user_permissions`
4. `revokePermission(supabase, userId, permissionKey)` — deletes from `user_permissions` matching user + permission key
5. `applyTemplate(supabase, userId, permissionKeys)` — deletes all existing grants for user, then inserts each key

Each function takes a Supabase client as first param (same pattern as `settingsQueries.ts`).

- [ ] **Step 2: Commit**

```bash
git add apps/admin/src/features/users/infrastructure/
git commit -m "feat(admin): add user permission Supabase queries"
```

---

### Task 3: Application Hooks

**Files:**

- Create: `apps/admin/src/features/users/application/hooks/useUserSearch.ts`
- Create: `apps/admin/src/features/users/application/hooks/useUserPermissions.ts`
- Create: `apps/admin/src/features/users/application/hooks/useTogglePermission.ts`

- [ ] **Step 1: Create useUserSearch hook**

React Query hook that calls `searchUsers`. Query key: `["user-search", query]`. Enabled only when query is 3+ chars.

- [ ] **Step 2: Create useUserPermissions hook**

React Query hook that calls `getUserPermissionKeys`. Query key: `["user-permissions", userId]`. Returns the granted permission key array.

- [ ] **Step 3: Create useTogglePermission hook**

`useMutation` that calls either `grantPermission` or `revokePermission` based on a `granted` boolean param. On success, invalidates the `["user-permissions", userId]` query.

Also create a `useApplyTemplate` mutation hook that calls `applyTemplate` and invalidates.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/users/application/
git commit -m "feat(admin): add permission management hooks"
```

---

### Task 4: Presentation Components

**Files:**

- Create: `apps/admin/src/features/users/presentation/components/UserSearch.tsx`
- Create: `apps/admin/src/features/users/presentation/components/PermissionGroupCard.tsx`
- Create: `apps/admin/src/features/users/presentation/components/TemplateButtons.tsx`
- Create: `apps/admin/src/features/users/presentation/components/UserPermissionPanel.tsx`

- [ ] **Step 1: Create UserSearch**

Debounced input (300ms). Calls `useUserSearch`. Shows results as a list of user cards (email + display name). Clicking a user calls `onSelectUser(userId, email)`.

Test IDs: `user-search-input`, `user-search-result-{userId}`

- [ ] **Step 2: Create PermissionGroupCard**

Renders one permission group (e.g., "Products & Commerce") with its permission checkboxes. Each checkbox shows the operation name (Create/Read/Update/Delete) extracted from the key. Shows dependency warnings inline.

Props: `group: PermissionGroup, grantedKeys: string[], allGrantedKeys: string[], onToggle: (key, granted) => void`

Test IDs: `permission-group-{groupKey}`, `permission-toggle-{permissionKey}`

- [ ] **Step 3: Create TemplateButtons**

Row of buttons: Buyer, Seller, Admin, None. Each calls `onApplyTemplate(templateKeys)`.

Test IDs: `template-btn-buyer`, `template-btn-seller`, `template-btn-admin`, `template-btn-none`

- [ ] **Step 4: Create UserPermissionPanel**

Composes the above: shows user email/name at top, template buttons, then all `PermissionGroupCard` components. Uses `useUserPermissions` and `useTogglePermission` hooks.

Test ID: `user-permission-panel`

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/users/presentation/components/
git commit -m "feat(admin): add permission management components"
```

---

### Task 5: Page + Route + Sidebar

**Files:**

- Create: `apps/admin/src/features/users/presentation/pages/UserPermissionsPage.tsx`
- Create: `apps/admin/src/features/users/index.ts`
- Create: `apps/admin/src/app/[locale]/users/page.tsx`
- Modify: `apps/admin/src/shared/presentation/components/AdminSidebar.tsx`

- [ ] **Step 1: Create UserPermissionsPage**

Main page: title + subtitle + `UserSearch`. When a user is selected, shows `UserPermissionPanel` below search.

Test ID: `user-permissions-page`

- [ ] **Step 2: Create barrel export**

`apps/admin/src/features/users/index.ts`:

```typescript
export { UserPermissionsPage } from "./presentation/pages/UserPermissionsPage";
```

- [ ] **Step 3: Create route page**

`apps/admin/src/app/[locale]/users/page.tsx` — thin wrapper (same pattern as settings/page.tsx).

- [ ] **Step 4: Add to AdminSidebar**

Add a new section to `NAV_SECTIONS` in `AdminSidebar.tsx`:

```typescript
{
  labelKey: "users" as const,
  items: [
    { key: "userPermissions" as const, href: "/users", icon: Shield },
  ],
}
```

Import `Shield` from `lucide-react`.

- [ ] **Step 5: Verify the page loads**

Start dev servers, navigate to `http://localhost:5002/en/users`. Should see the page with search input.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/features/users/ apps/admin/src/app/[locale]/users/ apps/admin/src/shared/
git commit -m "feat(admin): add User Permissions page with sidebar nav"
```

---

### Task 6: E2E Test — Permission Grant/Revoke

**Files:**

- Create: `apps/auth/e2e/permission-management.spec.ts`

- [ ] **Step 1: Write the E2E test**

The test creates an admin + target user, then tests the full grant/revoke flow through the admin UI.

Key phases:

1. Setup: create admin with `ADMIN_PERMISSIONS`, target with `BUYER_PERMISSIONS`
2. Admin opens `/en/users`, searches for target by email
3. Admin sees target's buyer permissions (checkboxes checked)
4. Admin grants `products.create` (checks the box)
5. Verify: switch to target, navigate to Studio, confirm can create products
6. Admin revokes `orders.create` (unchecks the box)
7. Admin applies "None" template — all unchecked
8. Cleanup

The test needs the Playwright config to include the admin app server (port 5002). Check if `apps/auth/playwright.config.ts` already includes it — if not, add it.

Test IDs to use: `user-search-input`, `user-search-result-{id}`, `permission-toggle-{key}`, `template-btn-none`, `user-permission-panel`

Screenshots at key steps using the same `snap()` helper.

- [ ] **Step 2: Run the E2E test**

```bash
cd apps/auth && npx playwright test e2e/permission-management.spec.ts --headed --timeout 120000
```

Fix failures iteratively (TDD style).

- [ ] **Step 3: Commit**

```bash
git add apps/auth/e2e/permission-management.spec.ts apps/auth/playwright.config.ts
git commit -m "test(e2e): permission grant/revoke flow via admin UI"
```

---

### Task 7: Verify everything

- [ ] **Step 1: Run unit tests**

```bash
pnpm test
```

- [ ] **Step 2: Run both E2E tests**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --timeout 120000
cd apps/auth && npx playwright test e2e/permission-management.spec.ts --timeout 120000
```

- [ ] **Step 3: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

- [ ] **Step 4: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: resolve issues from permission management feature"
```
