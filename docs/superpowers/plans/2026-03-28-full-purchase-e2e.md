# Full Purchase Flow E2E Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Playwright E2E test that exercises the complete seller→buyer→approval lifecycle across studio, store, and payments apps.

**Architecture:** Single test file using the existing auth fixture pattern to create two test users (seller + buyer). Session switching via cookie injection. Data cleanup via Supabase admin API. TDD: write the test first, run it, fix app code to make it pass.

**Tech Stack:** Playwright, Supabase admin API, Next.js dev servers (4 apps)

---

## File Structure

### New files

| File                                       | Responsibility                                        |
| ------------------------------------------ | ----------------------------------------------------- |
| `apps/auth/e2e/full-purchase-flow.spec.ts` | The E2E test — 7 phases across 4 apps                 |
| `apps/auth/e2e/helpers/session.ts`         | Reusable helper: create user + inject session cookies |
| `apps/auth/e2e/helpers/cleanup.ts`         | Reusable helper: delete test data via Supabase admin  |

### Modified files

| File                             | Change                            |
| -------------------------------- | --------------------------------- |
| `apps/auth/playwright.config.ts` | Add payments + studio web servers |

---

### Task 1: Update Playwright config to start all 4 app servers

**Files:**

- Modify: `apps/auth/playwright.config.ts`

- [ ] **Step 1: Add payments and studio web servers to the config**

Open `apps/auth/playwright.config.ts` and replace the `webServer` array with:

```typescript
webServer: [
  {
    command: process.env.CI
      ? "npx next start --port 5000"
      : "npx next dev --port 5000",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  {
    command: process.env.CI
      ? "npx next start --port 5001"
      : "npx next dev --port 5001",
    cwd: path.resolve(__dirname, "../store"),
    url: "http://localhost:5001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  {
    command: process.env.CI
      ? "npx next start --port 5005"
      : "npx next dev --port 5005",
    cwd: path.resolve(__dirname, "../payments"),
    url: "http://localhost:5005",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  {
    command: process.env.CI
      ? "npx next start --port 5006"
      : "npx next dev --port 5006",
    cwd: path.resolve(__dirname, "../studio"),
    url: "http://localhost:5006",
    reuseExistingServer: true,
    timeout: 120_000,
  },
],
```

- [ ] **Step 2: Commit**

```bash
git add apps/auth/playwright.config.ts
git commit -m "chore(e2e): add payments and studio servers to Playwright config"
```

---

### Task 2: Create session and cleanup helpers

**Files:**

- Create: `apps/auth/e2e/helpers/session.ts`
- Create: `apps/auth/e2e/helpers/cleanup.ts`

- [ ] **Step 1: Create session helper**

Create `apps/auth/e2e/helpers/session.ts`:

```typescript
import path from "node:path";

import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS loader script
const { loadRootEnv } = require(
  path.resolve(__dirname, "../../../../scripts/load-root-env.js"),
);
loadRootEnv();

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface TestUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a test user via Supabase admin API.
 * Returns user info + tokens (does NOT inject cookies).
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `e2e-${label}-${Date.now()}@test.invalid`;
  const password = `test-${Date.now()}-${label}`;

  const { data: user, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError)
    throw new Error(`Failed to create ${label} user: ${createError.message}`);

  const { data: session, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({ email, password });

  if (signInError)
    throw new Error(`Failed to sign in ${label} user: ${signInError.message}`);

  return {
    userId: user.user!.id,
    email,
    accessToken: session.session!.access_token,
    refreshToken: session.session!.refresh_token,
  };
}

/**
 * Inject a user's session cookies into the browser context.
 * Call this to "switch" to a different user.
 */
export async function injectSession(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  const cookieBase = `sb-${projectRef}-auth-token`;

  // Clear existing auth cookies first
  const cookies = await context.cookies();
  const authCookies = cookies.filter((c) => c.name.startsWith("sb-"));
  if (authCookies.length > 0) {
    await context.clearCookies();
  }

  await context.addCookies([
    {
      name: `${cookieBase}.0`,
      value: `base64-${btoa(
        JSON.stringify({
          access_token: user.accessToken,
          refresh_token: user.refreshToken,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: user.userId, email: user.email },
        }),
      )}`,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
```

- [ ] **Step 2: Create cleanup helper**

Create `apps/auth/e2e/helpers/cleanup.ts`:

```typescript
import { supabaseAdmin } from "./session";

/**
 * Delete all test data created during the E2E test.
 * Order matters — foreign keys require specific deletion order.
 */
export async function cleanupTestData(
  sellerUserId: string,
  buyerUserId: string,
): Promise<void> {
  // 1. Delete orders (references seller + buyer + payment methods + products)
  await supabaseAdmin
    .from("order_items")
    .delete()
    .or(`order_id.in.(select id from orders where user_id='${buyerUserId}')`);

  await supabaseAdmin.from("orders").delete().eq("user_id", buyerUserId);

  // 2. Delete seller's payment methods
  await supabaseAdmin
    .from("seller_payment_methods")
    .delete()
    .eq("seller_id", sellerUserId);

  // 3. Delete seller's products
  await supabaseAdmin.from("products").delete().eq("seller_id", sellerUserId);

  // 4. Delete both users
  await supabaseAdmin.auth.admin.deleteUser(sellerUserId);
  await supabaseAdmin.auth.admin.deleteUser(buyerUserId);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/auth/e2e/helpers/
git commit -m "feat(e2e): add session and cleanup helpers for multi-user tests"
```

---

### Task 3: Write the full purchase flow test (TDD — write first, fix later)

**Files:**

- Create: `apps/auth/e2e/full-purchase-flow.spec.ts`

- [ ] **Step 1: Write the complete test**

Create `apps/auth/e2e/full-purchase-flow.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  createTestUser,
  injectSession,
  type TestUser,
} from "./helpers/session";

const STUDIO = "http://localhost:5006";
const STORE = "http://localhost:5001";
const PAYMENTS = "http://localhost:5005";

test.describe.serial("Full purchase flow: seller → buyer → approval", () => {
  let seller: TestUser;
  let buyer: TestUser;

  test.beforeAll(async () => {
    seller = await createTestUser("seller");
    buyer = await createTestUser("buyer");
  });

  test.afterAll(async () => {
    await cleanupTestData(seller.userId, buyer.userId);
  });

  // ─── Phase 1: Seller creates a product in Studio ───────────────

  test("seller creates a product in studio", async ({ context, page }) => {
    await injectSession(context, seller);

    // Navigate to studio
    await page.goto(`${STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    // Click "New Product"
    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");

    // Fill product name (EN)
    await page.getByTestId("inline-text-en-name_en").fill("E2E Test Product");

    // Set price
    await page.getByTestId("price-cop").fill("10000");

    // Save
    await page.getByTestId("toolbar-save").click();

    // Wait for redirect back to product list
    await page.waitForURL(`${STUDIO}/en`);
    await expect(page.getByText("E2E Test Product")).toBeVisible();
  });

  // ─── Phase 2: Seller configures payment method in Payments ─────

  test("seller adds a payment method", async ({ context, page }) => {
    await injectSession(context, seller);

    await page.goto(`${PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    // Click "Add Method"
    await page.getByTestId("add-payment-method-button").click();

    // Select first payment type
    const typeSelect = page.getByTestId("payment-type-select");
    await typeSelect.selectOption({ index: 1 });

    // Fill account details (EN)
    await page
      .getByTestId("payment-type-account-en")
      .fill("E2E Bank Account 12345");

    // Save
    await page.getByTestId("payment-type-save").click();

    // Verify method appears in table
    await expect(page.getByText("E2E Bank Account 12345")).toBeVisible();
  });

  // ─── Phase 3: Buyer browses store and adds to cart ─────────────

  test("buyer finds product and adds to cart", async ({ context, page }) => {
    await injectSession(context, buyer);

    // Go to store
    await page.goto(`${STORE}/en`);
    await page.waitForLoadState("networkidle");

    // Find the seller's product and click it
    const productCard = page.getByText("E2E Test Product").first();
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    // On product detail page, click Add to Cart
    await page.getByTestId("hero-add-to-cart").click();

    // Open cart drawer
    await page.getByTestId("cart-drawer-trigger").click();

    // Verify item in cart
    await expect(page.getByTestId("cart-drawer-items")).toBeVisible();
    await expect(page.getByText("E2E Test Product")).toBeVisible();
  });

  // ─── Phase 4: Buyer checks out ────────────────────────────────

  test("buyer completes checkout", async ({ context, page }) => {
    await injectSession(context, buyer);

    // Cart should still have items from previous test (cookie-based)
    await page.goto(`${STORE}/en`);
    await page.getByTestId("cart-drawer-trigger").click();
    await page.getByTestId("cart-checkout").click();

    // Wait for payments checkout page
    await page.waitForURL(/payments.*checkout/);
    await page.waitForLoadState("networkidle");

    // Select payment method for the seller
    const methodSelect = page.getByTestId("payment-method-select").first();
    await methodSelect.selectOption({ index: 1 });

    // Enter transfer number
    const transferInput = page
      .locator("[data-testid^='transfer-number-']")
      .first();
    await transferInput.fill("TXN-E2E-12345");

    // Submit payment
    const submitBtn = page.locator("[data-testid^='submit-payment-']").first();
    await submitBtn.click();

    // Wait for success state
    await expect(page.getByTestId("checkout-all-submitted")).toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── Phase 5: Buyer verifies order status ─────────────────────

  test("buyer sees pending verification order", async ({ context, page }) => {
    await injectSession(context, buyer);

    await page.goto(`${PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // Verify order exists with pending status
    await expect(
      page.getByTestId("order-status-pending_verification"),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 6: Seller approves the payment ─────────────────────

  test("seller approves the order", async ({ context, page }) => {
    await injectSession(context, seller);

    await page.goto(`${PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");

    // Find the order and approve
    const approveBtn = page.locator("[data-testid^='order-approve-']").first();
    await expect(approveBtn).toBeVisible({ timeout: 10_000 });
    await approveBtn.click();

    // Confirm approval (may have a confirm dialog or direct action)
    // Wait for status to change
    await expect(page.getByTestId("order-status-badge")).toContainText(
      /approved/i,
      { timeout: 10_000 },
    );
  });

  // ─── Phase 7: Buyer sees approval ─────────────────────────────

  test("buyer sees approved order", async ({ context, page }) => {
    await injectSession(context, buyer);

    await page.goto(`${PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("order-status-approved")).toBeVisible({
      timeout: 10_000,
    });
  });
});
```

- [ ] **Step 2: Run the test to see where it fails first (TDD red phase)**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed --timeout 120000
```

Expected: The test will fail at some point — likely at form interactions where test IDs don't match or selectors need adjusting. This is the TDD approach: the test drives discovery of what needs fixing.

- [ ] **Step 3: Commit the test as-is**

```bash
git add apps/auth/e2e/full-purchase-flow.spec.ts
git commit -m "test(e2e): add full purchase flow test (red phase — TDD)"
```

---

### Task 4: Fix test failures — make Phase 1 pass (seller creates product)

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts` (adjust selectors as needed)
- Modify: Studio source files (add missing test IDs if needed)

- [ ] **Step 1: Run the test focused on Phase 1**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed -g "seller creates a product"
```

- [ ] **Step 2: Fix each failure**

Read the Playwright error output. Common fixes:

- Selector doesn't match → adjust the test ID or use a different locator
- Form field not filling → the inline editor uses `LangTextarea` with a specific test ID pattern (`inline-text-en-name_en`)
- Save button doesn't navigate → may need to wait for mutation to complete

After each fix, re-run until Phase 1 passes.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(e2e): make Phase 1 (seller creates product) pass"
```

---

### Task 5: Fix test failures — make Phase 2 pass (seller adds payment method)

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts` (adjust selectors)
- Modify: Payments source files (add missing test IDs if needed)

- [ ] **Step 1: Run the test focused on Phase 2**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed -g "seller adds a payment method"
```

- [ ] **Step 2: Fix each failure**

The PaymentMethodEditor has a `<select>` for payment types and textarea fields. Check:

- The `select` test ID (`payment-type-select` in test vs actual component)
- The account details textarea test ID
- The save button test ID

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(e2e): make Phase 2 (seller adds payment method) pass"
```

---

### Task 6: Fix test failures — make Phases 3-4 pass (buyer checkout)

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts`
- Modify: Store/Payments source files (add missing test IDs if needed)

- [ ] **Step 1: Run Phases 3-4**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed -g "buyer finds product|buyer completes checkout"
```

- [ ] **Step 2: Fix each failure**

Key issues to watch for:

- Product might not appear immediately in store (Supabase real-time sync)
- Cart drawer interaction (Sheet component from shadcn)
- Checkout page needs cart cookie to be set (store → payments cross-app)
- Payment method dropdown may not have the seller's method yet

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(e2e): make Phases 3-4 (buyer checkout) pass"
```

---

### Task 7: Fix test failures — make Phases 5-7 pass (verification + approval)

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts`
- Modify: Payments source files (add missing test IDs if needed)

- [ ] **Step 1: Run Phases 5-7**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed -g "buyer sees pending|seller approves|buyer sees approved"
```

- [ ] **Step 2: Fix each failure**

Key issues:

- Orders page may need time to reflect the new order
- Seller's received orders page needs the status filter
- Approve button triggers a mutation — wait for status update
- Buyer's order status should change from `pending_verification` to `approved`

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(e2e): make Phases 5-7 (verification and approval) pass"
```

---

### Task 8: Run the full test end-to-end and polish

**Files:**

- Modify: `apps/auth/e2e/full-purchase-flow.spec.ts` (final adjustments)

- [ ] **Step 1: Run the complete test**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts --headed
```

All 7 phases should pass sequentially.

- [ ] **Step 2: Run it headless to confirm CI readiness**

```bash
cd apps/auth && npx playwright test e2e/full-purchase-flow.spec.ts
```

- [ ] **Step 3: Run the existing smoke test to make sure nothing broke**

```bash
pnpm smoke
```

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "test(e2e): full purchase flow passes end-to-end"
```
