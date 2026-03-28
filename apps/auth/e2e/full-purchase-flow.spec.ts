import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  adminInsert,
  adminQuery,
  createTestUser,
  injectSession,
  type TestUser,
} from "./helpers/session";

const STORE = "http://localhost:5001";
const PAYMENTS = "http://localhost:5005";

/**
 * Full purchase flow E2E test.
 *
 * Exercises the complete seller → buyer → approval lifecycle:
 * 1. Seller creates a product in Studio
 * 2. Seller configures a payment method in Payments
 * 3. Buyer finds the product in Store and adds to cart
 * 4. Buyer checks out via Payments
 * 5. Buyer verifies order is "Pending Verification"
 * 6. Seller approves the payment in Payments
 * 7. Buyer sees order is "Approved"
 *
 * Requires: supabase start + pnpm dev (all apps)
 */
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

  // ─── Phase 1-2: Seller setup via admin API (product + payment method) ───

  test("Phase 1-2: seller has a product and payment method", async () => {
    // Create product via admin REST API (bypasses RLS)
    await adminInsert("products", {
      name_en: "E2E Test Product",
      name_es: "Producto E2E",
      description_en: "A test product for E2E",
      description_es: "Un producto de prueba",
      type: "merch",
      category: "merch",
      price_cop: 10000,
      price_usd: 0,
      is_active: true,
      seller_id: seller.userId,
      slug: `e2e-test-${Date.now()}`,
      sort_order: 999,
      max_quantity: 100,
    });

    // Create an E2E-only payment type that doesn't require receipt
    // (Storage upload from injected cookies has auth limitations)
    const paymentType = await adminInsert("payment_method_types", {
      name_en: "E2E Direct Transfer",
      name_es: "Transferencia E2E",
      icon: "credit-card",
      requires_receipt: false,
      requires_transfer_number: true,
      is_active: true,
      sort_order: 999,
    });

    // Create seller payment method via admin REST API
    await adminInsert("seller_payment_methods", {
      seller_id: seller.userId,
      type_id: paymentType.id,
      account_details_en: "E2E Bank Account 12345",
      account_details_es: "Cuenta E2E 12345",
      is_active: true,
      sort_order: 1,
    });

    // Verify both exist
    const products = await adminQuery(
      "products",
      `seller_id=eq.${seller.userId}`,
    );
    expect(products).toHaveLength(1);

    const methods = await adminQuery(
      "seller_payment_methods",
      `seller_id=eq.${seller.userId}`,
    );
    expect(methods).toHaveLength(1);
  });

  // ─── Phase 3-4: Buyer browses store, adds to cart, checks out ──

  test("Phase 3-4: buyer finds product, adds to cart, and checks out", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    // Go to store catalog
    await page.goto(`${STORE}/en`);
    await page.waitForLoadState("networkidle");

    // Search for the seller's product
    await page.getByTestId("search-bar-input").fill("E2E Test");
    await page.waitForTimeout(1000); // debounce

    // Click the first matching product card
    const productCard = page.getByTestId("product-card-link").first();
    await expect(productCard).toBeVisible({ timeout: 10_000 });
    await productCard.click();

    // Wait for product detail page
    await page.waitForLoadState("networkidle");

    // Click "Add to Cart"
    await page.getByTestId("hero-add-to-cart").click();

    // Wait for add-to-cart animation to finish
    await page.waitForTimeout(2000);

    // Open cart drawer (force click — fly-to-cart animation can intercept)
    await page
      .getByTestId("cart-drawer-trigger")
      .first()
      .click({ force: true });

    // Verify item in cart
    await expect(page.getByTestId("cart-drawer-items")).toBeVisible();
    await expect(page.getByTestId("cart-item-name")).toBeVisible();

    // Click checkout — navigates to payments app
    await page.getByTestId("cart-checkout").click();

    // Wait for payments checkout page
    await page.waitForURL(/localhost:5005.*checkout/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // Wait for items and payment method to load
    await expect(page.getByTestId("checkout-items-summary")).toBeVisible({
      timeout: 10_000,
    });

    // Select payment method
    const methodSelect = page.getByTestId("payment-method-select").first();
    await methodSelect.waitFor({ state: "visible", timeout: 10_000 });
    await page.waitForTimeout(2000);
    const selectedValue = await methodSelect.inputValue();
    if (!selectedValue) {
      await methodSelect.selectOption({ index: 1 });
    }

    // Enter transfer number
    const transferInput = page.getByTestId(/^transfer-number-/).first();
    const transferVisible = await transferInput
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (transferVisible) {
      await transferInput.fill("TXN-E2E-12345");
    }

    // Submit payment (no receipt needed — E2E payment type)
    const submitBtn = page.getByTestId(/^submit-payment-/).first();
    await submitBtn.click();

    // Wait for success state
    await expect(page.getByTestId("checkout-all-submitted")).toBeVisible({
      timeout: 30_000,
    });
  });

  // ─── Phase 5: Buyer verifies order status ─────────────────────

  test("Phase 5: buyer sees pending verification order", async ({
    context,
    page,
  }) => {
    await injectSession(context, buyer);

    await page.goto(`${PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // Verify order exists with "pending_verification" status
    await expect(
      page.getByTestId("order-status-pending_verification"),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 6: Seller approves the payment ─────────────────────

  test("Phase 6: seller approves the order", async ({ context, page }) => {
    await injectSession(context, seller);

    await page.goto(`${PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");

    // Find the approve button
    const approveBtn = page.getByTestId(/^order-approve-/).first();
    await expect(approveBtn).toBeVisible({ timeout: 10_000 });

    // Accept the confirm dialog before clicking
    page.on("dialog", (dialog) => dialog.accept());
    await approveBtn.click();

    // Wait for mutation to complete, then reload to see updated status
    await page.waitForTimeout(3000);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Approve button should be gone after approval
    await expect(page.getByTestId(/^order-approve-/).first()).not.toBeVisible({
      timeout: 15_000,
    });
  });

  // ─── Phase 7: Buyer sees approval ─────────────────────────────

  test("Phase 7: buyer sees approved order", async ({ context, page }) => {
    await injectSession(context, buyer);

    await page.goto(`${PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // Verify order shows approved status
    await expect(page.getByTestId("order-status-approved")).toBeVisible({
      timeout: 10_000,
    });
  });
});
