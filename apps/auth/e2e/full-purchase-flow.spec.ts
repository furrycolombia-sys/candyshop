import { expect, test } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  adminInsert,
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

  // ─── Phase 1: Seller creates a product in Studio ───────────────

  test("Phase 1: seller creates a product in studio", async ({
    context,
    page,
  }) => {
    await injectSession(context, seller);

    // Navigate to studio
    await page.goto("http://localhost:5006/en");
    await page.waitForLoadState("networkidle");

    // Click "New Product"
    await page.getByTestId("new-product-button").click();
    await page.waitForLoadState("networkidle");

    // Fill product name (EN)
    const nameField = page.getByTestId("inline-text-en-name_en");
    await nameField.click();
    await nameField.fill("E2E Test Product");

    // Set price COP
    const priceField = page.getByTestId("inline-price-cop");
    await priceField.click();
    await priceField.fill("10000");

    // Save (button says "CREATE")
    await page.getByTestId("toolbar-save").click();

    // Wait for redirect back to product list
    await page.waitForURL("http://localhost:5006/en", { timeout: 15_000 });

    // Verify product appears in table
    await expect(page.getByTestId("product-table")).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── Phase 2: Seller configures payment method in Payments ─────

  test("Phase 2: seller adds a payment method", async ({ context, page }) => {
    await injectSession(context, seller);

    // Ensure an E2E payment type exists (no receipt required)
    // This is admin-level setup — must use API since the seller can't create types
    await adminInsert("payment_method_types", {
      name_en: "E2E Direct Transfer",
      name_es: "Transferencia E2E",
      icon: "credit-card",
      requires_receipt: false,
      requires_transfer_number: true,
      is_active: true,
      sort_order: 999,
    });

    // Navigate to payments app — payment methods page
    await page.goto(`${PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    // Click "Add Method"
    await page.getByTestId("add-payment-method-button").click();

    // Wait for the type select and select "E2E Direct Transfer"
    const typeSelect = page.getByTestId("payment-method-type-select");
    await typeSelect.waitFor({ state: "visible" });
    await page.waitForTimeout(1000);
    // Select by label text
    await typeSelect.selectOption({ label: "E2E Direct Transfer" });

    // Fill account details (EN)
    await page
      .getByTestId("payment-method-account-en")
      .fill("E2E Bank Account 12345");

    // Save
    await page.getByTestId("payment-method-save").click();

    // Wait for editor to close (indicates save succeeded)
    await expect(page.getByTestId("payment-method-save")).not.toBeVisible({
      timeout: 10_000,
    });

    // Verify method appears in the table
    await expect(page.getByTestId("payment-methods-page")).toBeVisible();
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
