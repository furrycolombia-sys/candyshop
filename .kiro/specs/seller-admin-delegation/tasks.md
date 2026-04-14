# Tasks: Seller Admin Delegation

## Task 1: Database Schema & Migration

Create the `seller_admins` table and register new permission keys.

- [x] 1.1 Create Supabase migration for `seller_admins` table with columns: id (uuid PK default gen_random_uuid()), seller_id (uuid FK → user_profiles), admin_user_id (uuid FK → user_profiles), permissions (text[]), created_at (timestamptz default now()), updated_at (timestamptz default now())
- [x] 1.2 Add CHECK constraint: `seller_id <> admin_user_id`
- [x] 1.3 Add UNIQUE constraint on `(seller_id, admin_user_id)`
- [x] 1.4 Enable RLS on `seller_admins` with policies: SELECT for `auth.uid() = seller_id OR auth.uid() = admin_user_id`, INSERT/UPDATE/DELETE for `auth.uid() = seller_id`
- [x] 1.5 Insert new permission rows into `permissions` table: `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete`, `orders.approve`, `orders.request_proof`
- [x] 1.6 Insert corresponding `resource_permissions` rows for the new permission keys
- [x] 1.7 Add `updated_at` trigger to auto-update on row modification

## Task 2: Domain Layer

Create domain types, constants, and validation for the seller-admins feature.

- [x] 2.1 Create `apps/studio/src/features/seller-admins/domain/types.ts` with `SellerAdmin`, `DelegatePermission`, `DelegateWithProfile`, `DelegatedOrderContext`, and `OrderAction` types
- [x] 2.2 Create `apps/studio/src/features/seller-admins/domain/constants.ts` with `DELEGATE_PERMISSIONS`, `SELLER_ADMINS_QUERY_KEY`, `DELEGATED_ORDERS_QUERY_KEY`, and `ACTIONABLE_ORDER_STATUSES`
- [x] 2.3 Create `apps/studio/src/features/seller-admins/domain/validation.ts` with `validateDelegateInput(sellerId, adminUserId, permissions)` that enforces self-delegation prevention, non-empty permissions, and valid permission values
- [x] 2.4 Write unit tests for validation functions in `validation.test.ts`

## Task 3: Infrastructure Layer — Delegation Queries

Create Supabase query functions for managing delegations.

- [x] 3.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegateQueries.ts` with `fetchDelegates(supabase, sellerId)` that returns `DelegateWithProfile[]` by joining `seller_admins` with `user_profiles`
- [x] 3.2 Add `searchUsers(supabase, query, excludeUserId)` function that searches `user_profiles` by email/display_name with `escapeLikePattern` sanitization, excluding the seller's own profile
- [x] 3.3 Write unit tests for `delegateQueries.ts` with mocked Supabase client

## Task 4: Infrastructure Layer — Delegation Mutations

Create Supabase mutation functions for adding, updating, and removing delegates.

- [x] 4.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegateMutations.ts` with `addDelegate(supabase, sellerId, adminUserId, permissions)` that validates input and inserts into `seller_admins`
- [x] 4.2 Add `updateDelegatePermissions(supabase, sellerId, adminUserId, permissions)` function
- [x] 4.3 Add `removeDelegate(supabase, sellerId, adminUserId)` function that deletes the `seller_admins` row
- [x] 4.4 Write unit tests for `delegateMutations.ts` with mocked Supabase client

## Task 5: Infrastructure Layer — Delegated Order Queries & Actions

Create functions for delegates to view and act on orders.

- [x] 5.1 Create `apps/studio/src/features/seller-admins/infrastructure/delegatedOrderQueries.ts` with `fetchDelegatedOrders(supabase, delegateUserId)` that returns orders grouped by seller
- [x] 5.2 Create `apps/studio/src/features/seller-admins/infrastructure/delegatedOrderActions.ts` with `executeDelegateAction(supabase, delegateUserId, action)` implementing the permission-checked order action algorithm
- [x] 5.3 Write unit tests for delegated order queries and actions

## Task 6: Application Layer — Hooks

Create React hooks for delegation management and delegated order operations.

- [x] 6.1 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegates.ts` — TanStack Query hook wrapping `fetchDelegates`
- [x] 6.2 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegateMutations.ts` — mutation hooks for add, update, remove delegate with query invalidation
- [x] 6.3 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegationContext.ts` — hook returning `delegations`, `isLoading`, `isDelegateFor()`, `canApprove()`, `canRequestProof()`
- [x] 6.4 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegatedOrders.ts` — TanStack Query hook wrapping `fetchDelegatedOrders`
- [x] 6.5 Create `apps/studio/src/features/seller-admins/application/hooks/useDelegateOrderActions.ts` — mutation hook wrapping `executeDelegateAction`
- [x] 6.6 Write unit tests for all hooks

## Task 7: Permission System Integration

Update the existing permission constants and templates to include delegation permissions.

- [x] 7.1 Add `sellerAdmins` permission group to `PERMISSION_GROUPS` in `apps/admin/src/features/users/domain/constants.ts` with keys: `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete`, `orders.approve`, `orders.request_proof`
- [x] 7.2 Add `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete` to the `seller` template in `PERMISSION_TEMPLATES`
- [x] 7.3 Verify `ALL_PERMISSION_KEYS` automatically includes the new keys via `flatMap`

## Task 8: Presentation Layer — Delegate Management UI

Create the UI components for sellers to manage their delegates.

- [x] 8.1 Create `DelegateList` component displaying current delegates with their permissions, email, avatar, and a remove button
- [x] 8.2 Create `AddDelegateForm` component with user search input, permission checkboxes (orders.approve, orders.request_proof), and submit button
- [x] 8.3 Create `EditDelegatePermissions` component for updating an existing delegate's permissions
- [x] 8.4 Create `DelegateManagementPage` page component composing the list and form
- [x] 8.5 Write component tests with Testing Library

## Task 9: Presentation Layer — Delegated Orders UI

Create the UI for delegates to view and act on delegated orders.

- [x] 9.1 Create `DelegatedOrderList` component showing orders grouped by seller with seller name header
- [x] 9.2 Create `DelegateOrderActions` component with approve button (if canApprove) and request proof button (if canRequestProof) with seller note input
- [x] 9.3 Create `DelegatedOrdersPage` page component using `useDelegationContext` and `useDelegatedOrders`
- [x] 9.4 Write component tests with Testing Library

## Task 10: Feature Module Wiring & Routing

Wire up the feature module exports and add routes in the Studio app.

- [x] 10.1 Create `apps/studio/src/features/seller-admins/index.ts` exporting public API (pages, hooks)
- [x] 10.2 Add route for delegate management page in Studio app router
- [x] 10.3 Add route for delegated orders page in Studio app router
- [x] 10.4 Add navigation links to Studio sidebar/nav for delegate management and delegated orders
- [x] 10.5 Add i18n translation keys for all user-facing strings in the feature

## Task 11: E2E Test — Delegated Admin Purchase Flow

Create an E2E test in `apps/auth/e2e/` covering the full delegation lifecycle: a product exists, a buyer purchases it, the seller assigns a delegate (user C) to administrate their sales, user C sees the pending order and requests more proof, the buyer resubmits evidence, and user C approves the order.

- [x] 11.1 Create `apps/auth/e2e/delegated-admin-flow.spec.ts` with a serial test suite using the existing E2E helpers (`createTestUser`, `injectSession`, `cleanupTestData`, `createSnapHelper`, `APP_URLS`, constants). Create three test users: seller (with `SELLER_PERMISSIONS` + delegation permissions), buyer (with `BUYER_PERMISSIONS`), and delegate (user C, with minimal permissions). Add `seller_admins` cleanup to `afterAll`.
- [x] 11.2 Phase 1 — Seller creates a product: Seller creates a product in Studio using the existing `createProduct` helper pattern (navigate to Studio, click new-product-button, fill name/price, save).
- [x] 11.3 Phase 2 — Seller configures a payment method: Seller creates a payment method in Payments using the existing `createPaymentMethod` helper pattern (navigate to payment-methods, add method, fill name/instructions/field).
- [x] 11.4 Phase 3 — Buyer purchases the product: Buyer navigates to Store, searches for the product, adds to cart, checks out, selects the seller's payment method, fills the form field, and submits payment. Verify order shows as `pending_verification`.
- [x] 11.5 Phase 4 — Seller delegates user C: Seller navigates to the delegate management page in Studio, searches for user C by email, selects `orders.approve` and `orders.request_proof` permissions, and adds the delegate. Verify user C appears in the delegate list.
- [x] 11.6 Phase 5 — Delegate (user C) requests more proof: User C navigates to the delegated orders page in Studio, sees the buyer's pending order grouped under the seller, clicks the request-proof action, enters a seller note (e.g., "Please upload a clearer receipt photo"), and submits. Verify the order status changes to `evidence_requested`.
- [x] 11.7 Phase 6 — Buyer resubmits evidence: Buyer navigates to Payments purchases page, sees the order with `evidence_requested` status and the seller note, fills in a new transfer number in the resubmit form (`resubmit-transfer-{orderId}`), and submits (`resubmit-submit-{orderId}`). Verify the order returns to `pending_verification`.
- [x] 11.8 Phase 7 — Delegate (user C) approves the order: User C navigates back to delegated orders, sees the resubmitted order, clicks approve, confirms via the confirmation panel, and verifies the order status is now `approved`.
- [x] 11.9 Phase 8 — Buyer sees order approved: Buyer navigates to Payments purchases page and verifies the order shows `approved` status.
