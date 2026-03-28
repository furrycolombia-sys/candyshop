# Full Purchase Flow E2E Test Design

## Goal

A single Playwright E2E test that exercises the complete seller-to-buyer purchase lifecycle across 4 apps (studio, store, payments), ending with seller approval. Requires Supabase running locally.

## Test Users

Two test users created via Supabase admin API (same pattern as `auth.fixture.ts`):

| User   | Email                          | Role in test                                               |
| ------ | ------------------------------ | ---------------------------------------------------------- |
| Seller | `e2e-seller-{ts}@test.invalid` | Creates product, configures payment method, approves order |
| Buyer  | `e2e-buyer-{ts}@test.invalid`  | Browses store, buys product, submits payment               |

Both cleaned up after test completes (users + any data they created).

## Test Flow

### Phase 1: Seller Setup — Studio

1. Inject seller session cookies into browser
2. Navigate to studio (`http://localhost:5006/en`)
3. Click "New Product"
4. Fill product form:
   - Name: "E2E Test Product"
   - Type: merch, Category: merch
   - Price: 10000 COP
   - Active: true
5. Submit and verify product appears in table

### Phase 2: Seller Setup — Payment Methods

6. Navigate to payments app (`http://localhost:5005/en/payment-methods`)
7. Click "Add Method"
8. Select first available payment type from dropdown
9. Fill account details: "E2E test account 123"
10. Save and verify method appears in table as active

### Phase 3: Buyer Purchases — Store

11. Switch to buyer session (re-inject buyer cookies)
12. Navigate to store (`http://localhost:5001/en`)
13. Find the seller's product (search or scroll)
14. Click "Add to Cart"
15. Open cart drawer
16. Click "Checkout" (navigates to payments app)

### Phase 4: Buyer Checkout — Payments

17. On checkout page, verify seller's items appear
18. Select the seller's payment method from dropdown
19. Enter transfer number: "TXN-E2E-12345"
20. Submit payment
21. Verify success state ("All payments submitted")

### Phase 5: Buyer Verifies Order

22. Navigate to purchases page (`http://localhost:5005/en/purchases`)
23. Verify order appears with status "Pending Verification"

### Phase 6: Seller Approves — Payments

24. Switch back to seller session (re-inject seller cookies)
25. Navigate to sales page (`http://localhost:5005/en/sales`)
26. Find the buyer's order (filter by pending_verification)
27. Click "Approve"
28. Confirm approval
29. Verify order status changes to "Approved"

### Phase 7: Buyer Sees Approval

30. Switch to buyer session
31. Navigate to purchases page
32. Verify order now shows "Approved" status

## File Location

```
apps/auth/e2e/full-purchase-flow.spec.ts
```

Lives in auth app's E2E folder — same as existing smoke tests. Reuses the auth fixture pattern for user creation.

## Session Switching

The test needs to switch between seller and buyer within the same browser context. Implementation:

```typescript
async function injectSession(
  page: Page,
  accessToken: string,
  refreshToken: string,
) {
  // Clear existing cookies, inject new session cookie
  // Same pattern as auth.fixture.ts but parameterized
}
```

Both sessions (seller + buyer) are created at test setup. Switching is just re-injecting cookies and navigating.

## Playwright Config Changes

The auth app's `playwright.config.ts` currently starts auth + store servers. It needs to also start studio and payments:

```typescript
webServer: [
  { command: "pnpm dev:auth", port: 5000 },
  { command: "pnpm dev:store", port: 5001 },
  { command: "pnpm dev:payments", port: 5005 },
  { command: "pnpm dev:studio", port: 5006 },
];
```

## Data Cleanup

After test completes (pass or fail):

1. Delete buyer's orders via Supabase admin
2. Delete seller's payment methods via Supabase admin
3. Delete seller's products via Supabase admin
4. Delete both test users via Supabase admin API

Order matters — foreign keys require deleting orders before products/users.

## Prerequisites

- `supabase start` (local Supabase running)
- All 4 apps running (or Playwright starts them via webServer config)
- `SUPABASE_SERVICE_ROLE_KEY` available (from `.env` or Supabase local)

## Test ID Selectors

The test uses `data-testid` attributes already present in the codebase. Key ones:

| Element                    | Test ID                     |
| -------------------------- | --------------------------- |
| Studio new product button  | `new-product-button`        |
| Studio product table       | `product-table`             |
| Payments add method button | `add-payment-method-button` |
| Store product card         | `product-card-{id}`         |
| Store add to cart          | `hero-add-to-cart`          |
| Cart drawer                | `cart-drawer`               |
| Checkout submit            | `submit-payment`            |
| Order status badge         | `order-status-badge`        |
| Sales approve button       | `approve-button`            |

Some of these may need to be added to the source components.

## TDD Approach

Write the test first. Run it. Watch it fail at each step. Then fix the app code (add missing test IDs, fix bugs) to make it pass. The test drives the implementation of missing selectors and any bugs discovered.

## Run Command

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed
```

Or via root:

```bash
pnpm --filter auth-app exec playwright test e2e/full-purchase-flow.spec.ts
```
