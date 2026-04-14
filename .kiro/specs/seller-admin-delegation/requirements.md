# Requirements: Seller Admin Delegation

## Requirement 1: Delegation Management

Sellers can manage delegated administrators for their seller operations from the Studio app.

### Acceptance Criteria

1.1. Given a seller is authenticated in Studio, when they navigate to the delegation management page, then they see a list of their current delegates with each delegate's email, display name, avatar, and granted permissions.

1.2. Given a seller is on the delegation management page, when they search for a user by email or display name, then matching user profiles are displayed (excluding themselves) with results sanitized against SQL injection patterns.

1.3. Given a seller selects a user from search results, when they choose one or more permissions (orders.approve, orders.request_proof) and confirm, then a new delegation row is created in `seller_admins` and the delegate appears in the list.

1.4. Given a seller has an existing delegate, when they update the delegate's permissions, then the `seller_admins` row's permissions array is updated and the change is reflected in the UI.

1.5. Given a seller has an existing delegate, when they remove the delegate, then the `seller_admins` row is deleted and the delegate no longer appears in the list.

## Requirement 2: Delegation Constraints

The delegation system enforces integrity constraints to prevent invalid states.

### Acceptance Criteria

2.1. Given a seller attempts to add themselves as a delegate, when the addDelegate function is called with `seller_id === admin_user_id`, then the operation is rejected with a validation error before any database call.

2.2. Given a seller already has a delegation for a specific user, when they attempt to add the same user again, then the operation fails with a duplicate constraint error and the UI displays "This user is already a delegate."

2.3. Given a delegation is being created, when the permissions array is empty, then the operation is rejected with a validation error requiring at least one permission.

2.4. Given the `seller_admins` table, then for any `(seller_id, admin_user_id)` pair, at most one row exists (enforced by UNIQUE constraint).

## Requirement 3: Row Level Security

Only authorized users can access and modify delegation data.

### Acceptance Criteria

3.1. Given a `seller_admins` row exists, when the seller (`seller_id`) queries the table, then they can SELECT the row.

3.2. Given a `seller_admins` row exists, when the delegate (`admin_user_id`) queries the table, then they can SELECT the row.

3.3. Given a `seller_admins` row exists, when the delegate attempts to UPDATE or DELETE the row, then the operation is denied by RLS.

3.4. Given a user who is neither the seller nor the delegate, when they query `seller_admins`, then they see no rows (RLS filters them out).

3.5. Given a seller is authenticated, when they INSERT into `seller_admins` with their own `auth.uid()` as `seller_id`, then the insert succeeds. If `seller_id` does not match `auth.uid()`, the insert is denied.

## Requirement 4: Delegated Order Viewing

Delegates can view pending orders for sellers who delegated to them.

### Acceptance Criteria

4.1. Given a user has been delegated by one or more sellers, when they load the delegated orders view, then they see orders grouped by seller, showing only orders with `payment_status` in `["pending_verification", "evidence_requested"]`.

4.2. Given a user has no delegations, when they access the delegated orders view, then they see an empty state with no orders.

4.3. Given a delegate views orders, then each order group includes the seller's display name and the permissions the delegate has for that seller.

## Requirement 5: Delegate Order Actions

Delegates can approve purchases or request more proof on behalf of sellers, scoped by their granted permissions.

### Acceptance Criteria

5.1. Given a delegate has the `orders.approve` permission for a seller, when they approve an order belonging to that seller with `payment_status` of `"pending_verification"` or `"evidence_requested"`, then the order's `payment_status` is updated to `"approved"`.

5.2. Given a delegate has the `orders.request_proof` permission for a seller, when they request proof on an order with a non-empty seller note, then the order's `payment_status` is updated to `"evidence_requested"` and the `seller_note` is set.

5.3. Given a delegate does NOT have the required permission for an action, when they attempt the action, then the operation is rejected with a permission error.

5.4. Given an order's `payment_status` is NOT in `["pending_verification", "evidence_requested"]`, when a delegate attempts any action on it, then the operation is rejected with a state error.

5.5. Given a delegate attempts to request proof with an empty or missing `seller_note`, then the operation is rejected with a validation error.

## Requirement 6: Access Revocation

Removing a delegation immediately revokes the delegate's access to the seller's orders.

### Acceptance Criteria

6.1. Given a seller removes a delegate, when the delegate subsequently calls `fetchDelegatedOrders`, then the seller's orders are no longer included in the results.

6.2. Given a seller removes a delegate, when the delegate attempts to approve or request proof on one of the seller's orders, then the operation fails with "No delegation found for this seller."

## Requirement 7: Permission System Integration

The feature integrates with the existing permission system by adding new permission keys and a permission group.

### Acceptance Criteria

7.1. Given the database migration has run, then the `permissions` table contains rows for: `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete`, `orders.approve`, `orders.request_proof`.

7.2. Given the `PERMISSION_GROUPS` constant in the admin app, then it includes a `sellerAdmins` group containing all six delegation-related permission keys.

7.3. Given the `PERMISSION_TEMPLATES` constant, then the `seller` template includes `seller_admins.create`, `seller_admins.read`, `seller_admins.update`, `seller_admins.delete` so sellers can manage delegates by default.

## Requirement 8: Database Schema

The `seller_admins` table is created with proper schema, constraints, and RLS.

### Acceptance Criteria

8.1. Given the migration runs, then a `seller_admins` table exists with columns: `id` (uuid PK), `seller_id` (uuid FK → user_profiles), `admin_user_id` (uuid FK → user_profiles), `permissions` (text[]), `created_at` (timestamptz), `updated_at` (timestamptz).

8.2. Given the table schema, then a CHECK constraint ensures `seller_id <> admin_user_id`.

8.3. Given the table schema, then a UNIQUE constraint exists on `(seller_id, admin_user_id)`.

8.4. Given the table schema, then RLS is enabled with policies for SELECT (seller or delegate), INSERT/UPDATE/DELETE (seller only).

## Requirement 9: Delegation Context Hook

A React hook provides delegation context for UI components to check permissions.

### Acceptance Criteria

9.1. Given a user is authenticated, when `useDelegationContext()` is called, then it returns `delegations` (array of `DelegatedOrderContext`), `isLoading`, `isDelegateFor(sellerId)`, `canApprove(sellerId)`, and `canRequestProof(sellerId)`.

9.2. Given a user is a delegate for seller S with `orders.approve` permission, when `canApprove(S.id)` is called, then it returns `true`. When `canRequestProof(S.id)` is called, then it returns `false` (since that permission was not granted).

9.3. Given a user has no delegations, when `isDelegateFor(anyId)` is called, then it returns `false`.
