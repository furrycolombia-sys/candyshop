# Tasks: Seller Admin Delegation

## Task 1: Database Schema & Migration

Create the `seller_admins` table and register new permission keys.

- [ ] 1.1 Create Supabase migration for `seller_admins` table with columns: id (uuid PK default gen_random_uuid()), seller_id (uuid FK → user_profiles), admin_user_id (uuid FK → user_profiles), permissions (text[]), created_at (timestamptz default now()), updated_at (timestamptz default now())
- [ ] 1.2 Add CHECK constraint: `seller_id <> admin_user_id`
- [ ] 1.3 Add UNIQUE constraint on `(seller_id, admin_user_id)`
- [ ] 1.4 Enable RLS on `seller_admins` with policies: SELECT for `auth.uid() = seller_id OR auth.uid() = admin_user_id`, INSERT/UPDATE/DELETE for `auth.uid() = seller_id`
- [ ] 1.5 Insert new permission rows into `permissions` table: `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete`, `orders.approve`, `orders.request_proof`
- [ ] 1.6 Insert corresponding `resource_permissions` rows for the new permission keys
- [ ] 1.7 Add `updated_at` trigger to auto-update on row modification

## Task 2: Domain Layer

Create domain types, constants, and validation for the seller-admins feature.

- [ ] 2.1 Create `apps/studio/src/features/seller-admins/domain/types.ts` with `SellerAdmin`, `DelegatePermission`, `DelegateWithProfile`, `DelegatedOrderContext`, and `OrderAction` types
- [ ] 2.2 Create `apps/studio/src/features/seller-admins/domain/constants.ts` with `DELEGATE_PERMISSIONS`, `SELLER_ADMINS_QUERY_KEY`, `DELEGATED_ORDERS_QUERY_KEY`, and `ACTIONABLE_ORDER_STATUSES`
- [ ] 2.3 Create `apps/studio/src/features/seller-admins/domain/validation.ts` with `validateDelegateInput(sellerId, adminUserId, permissions)` that enforces self-delegation prevention, non-empty permissions, and valid permission values
- [ ] 2.4 Write unit tests for validation functions in `validation.test.ts`

## Task 3: Infrastructure Layer — Delegation Queries

Create Supabase query functions for managing delegations.

- [ ] 3.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegateQueries.ts` with `fetchDelegates(supabase, sellerId)` that returns `DelegateWithProfile[]` by joining `seller_admins` with `user_profiles`
- [ ] 3.2 Add `searchUsers(supabase, query, excludeUserId)` function that searches `user_profiles` by email/display_name with `escapeLikePattern` sanitization, excluding the seller's own profile
- [ ] 3.3 Write unit tests for `delegateQueries.ts` with mocked Supabase client

## Task 4: Infrastructure Layer — Delegation Mutations

Create Supabase mutation functions for adding, updating, and removing delegates.

- [ ] 4.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegateMutations.ts` with `addDelegate(supabase, sellerId, adminUserId, permissions)` that validates input and inserts into `seller_admins`
- [ ] 4.2 Add `updateDelegatePermissions(supabase, sellerId, adminUserId, permissions)` function
- [ ] 4.3 Add `removeDelegate(supabase, sellerId, adminUserId)` function that deletes the `seller_admins` row
- [ ] 4.4 Write unit tests for `delegateMutations.ts` with mocked Supabase client

## Task 5: Infrastructure Layer — Delegated Order Queries & Actions

Create functions for delegates to view and act on orders.

- [ ] 5.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegatedOrderQueries.ts` with `fetchDelegatedOrders(supabase, delegateUserId)` that returns orders grouped by seller
- [ ] 5.2 Create `apps/studio/src/features/seller-admins/infrastructure/delegatedOrderActions.ts` with `executeDelegateAction(supabase, delegateUserId, action)` implementing the permission-checked order action algorithm
- [ ] 5.3 Write unit tests for delegated order queries and actions

## Task 6: Application Layer — Hooks

Create React hooks for delegation management and delegated order operations.

- [ ] 6.1 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegates.ts` — TanStack Query hook wrapping `fetchDelegates`
- [ ] 6.2 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegateMutations.ts` — mutation hooks for add, update, remove delegate with query invalidation
- [ ] 6.3 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegationContext.ts` — hook returning `delegations`, `isLoading`, `isDelegateFor()`, `canApprove()`, `canRequestProof()`
- [ ] 6.4 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegatedOrders.ts` — TanStack Query hook wrapping `fetchDelegatedOrders`
- [ ] 6.5 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegateOrderActions.ts` — mutation hook wrapping `executeDelegateAction`
- [ ] 6.6 Write unit tests for all hooks

## Task 7: Permission System Integration

Update the existing permission constants and templates to include delegation permissions.

- [ ] 7.1 Add `sellerAdmins` permission group to `PERMISSION_GROUPS` in `apps/admin/src/features/users/domain/constants.ts` with keys: `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete`, `orders.approve`, `orders.request_proof`
- [ ] 7.2 Add `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete` to the `seller` template in `PERMISSION_TEMPLATES`
- [ ] 7.3 Verify `ALL_PERMISSION_KEYS` automatically includes the new keys via `flatMap`

## Task 8: Presentation Layer — Delegate Management UI

Create the UI components for sellers to manage their delegates.

- [ ] 8.1 Create `DelegateList` component displaying current delegates with their permissions, email, avatar, and a remove button
- [ ] 8.2 Create `AddDelegateForm` component with user search input, permission checkboxes (orders.approve, orders.request_proof), and submit button
- [ ] 8.3 Create `EditDelegatePermissions` component for updating an existing delegate's permissions
- [ ] 8.4 Create `DelegateManagementPage` page component composing the list and form
- [ ] 8.5 Write component tests with Testing Library

## Task 9: Presentation Layer — Delegated Orders UI

Create the UI for delegates to view and act on delegated orders.

- [ ] 9.1 Create `DelegatedOrderList` component showing orders grouped by seller with seller name header
- [ ] 9.2 Create `DelegateOrderActions` component with approve button (if canApprove) and request proof button (if canRequestProof) with seller note input
- [ ] 9.3 Create `DelegatedOrdersPage` page component using `useDelegationContext` and `useDelegatedOrders`
- [ ] 9.4 Write component tests with Testing Library

## Task 10: Feature Module Wiring & Routing

Wire up the feature module exports and add routes in the Studio app.

- [ ] 10.1 Create `apps/studio/src/features/seller-admins/index.ts` exporting public API (pages, hooks)
- [ ] 10.2 Add route for delegate management page in Studio app router
- [ ] 10.3 Add route for delegated orders page in Studio app router
- [ ] 10.4 Add navigation links to Studio sidebar/nav for delegate management and delegated orders
- [ ] 10.5 Add i18n translation keys for all user-facing strings in the feature
