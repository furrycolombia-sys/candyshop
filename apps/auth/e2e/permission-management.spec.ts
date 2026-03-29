import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { cleanupTestData } from "./helpers/cleanup";
import {
  APP_URLS,
  DEBOUNCE_WAIT_MS,
  ELEMENT_TIMEOUT_MS,
  MUTATION_WAIT_MS,
} from "./helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  injectSession,
  type TestUser,
} from "./helpers/session";
import { createSnapHelper } from "./helpers/snap";

const { snap, resetCounter } = createSnapHelper(
  path.resolve(__dirname, "screenshots-permissions"),
);

/**
 * Navigate to admin users page, search for a user, select them,
 * and wait for the permission panel to appear.
 */
async function searchAndSelectUser(
  page: Page,
  targetEmail: string,
  targetUserId: string,
): Promise<void> {
  await page.goto(`${APP_URLS.ADMIN}/en/users`);
  await page.waitForLoadState("networkidle");

  await page.getByTestId("user-search-input").fill(targetEmail);
  await page.waitForTimeout(DEBOUNCE_WAIT_MS);

  await page.getByTestId(`user-search-result-${targetUserId}`).click();
  await expect(page.getByTestId("user-permission-panel")).toBeVisible({
    timeout: ELEMENT_TIMEOUT_MS,
  });
}

/**
 * Revoke a single permission via the admin UI checkbox.
 * Assumes the permission is currently granted (checked).
 */
async function revokePermission(
  page: Page,
  context: import("@playwright/test").BrowserContext,
  admin: TestUser,
  target: TestUser,
  permissionKey: string,
): Promise<void> {
  await injectSession(context, admin);
  await searchAndSelectUser(page, target.email, target.userId);

  const checkbox = page.getByTestId(`permission-toggle-${permissionKey}`);
  await expect(checkbox).toBeChecked();
  await checkbox.click();
  await page.waitForTimeout(MUTATION_WAIT_MS);
  await expect(checkbox).not.toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
}

/**
 * Grant a single permission via the admin UI checkbox.
 * Assumes the permission is currently revoked (unchecked).
 */
async function grantPermission(
  page: Page,
  context: import("@playwright/test").BrowserContext,
  admin: TestUser,
  target: TestUser,
  permissionKey: string,
): Promise<void> {
  await injectSession(context, admin);
  await searchAndSelectUser(page, target.email, target.userId);

  const checkbox = page.getByTestId(`permission-toggle-${permissionKey}`);
  await expect(checkbox).not.toBeChecked();
  await checkbox.click();
  await page.waitForTimeout(MUTATION_WAIT_MS);
  await expect(checkbox).toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
}

// ═══════════════════════════════════════════════════════════════════
// Full permission E2E: admin grants/revokes across the entire system.
//
// Strategy: target starts with ALL admin permissions.
// We verify access, revoke one area at a time, verify block,
// re-grant, then nuke everything with "None" template.
//
// RLS is the enforcement layer — revoking READ permissions causes
// empty results; revoking CREATE doesn't hide UI buttons (that's
// client-side guards, a separate feature).
// ═══════════════════════════════════════════════════════════════════

test.describe
  .serial("Permission management: full system grant/revoke flow", () => {
  let admin: TestUser;
  let target: TestUser;

  test.beforeAll(async () => {
    resetCounter();
    admin = await createTestUser("admin", ADMIN_PERMISSIONS);
    target = await createTestUser("target", ADMIN_PERMISSIONS);
  });

  test.afterAll(async () => {
    await cleanupTestData(admin.userId, target.userId);
  });

  // ─── BASELINE: target can access everything ─────────────────

  test("Phase 1: baseline — Store catalog loads", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("product-catalog-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "store-catalog-baseline");
  });

  test("Phase 2: baseline — Studio loads with create button", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("new-product-button")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-baseline");
  });

  test("Phase 3: baseline — Payments purchases page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await page.waitForLoadState("networkidle");

    // New user, no orders — but page renders (not blocked)
    await expect(page.getByTestId("orders-empty")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payments-purchases-baseline");
  });

  test("Phase 4: baseline — Payment methods page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("payment-methods-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-baseline");
  });

  test("Phase 5: baseline — Admin audit log loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en/audit`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("audit-log-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "admin-audit-baseline");
  });

  test("Phase 6: baseline — Admin user permissions page loads", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en/users`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("user-permissions-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "admin-permissions-baseline");
  });

  // ─── STUDIO: revoke products.read → empty product list ──────

  test("Phase 7: admin revokes products.read", async ({ context, page }) => {
    await revokePermission(page, context, admin, target, "products.read");
    await snap(page, "admin-revoked-products-read");
  });

  test("Phase 8: target blocked — Studio shows empty products", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // RLS blocks products.read — table shows empty state
    await expect(page.getByTestId("products-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-products-blocked");
  });

  test("Phase 9: admin re-grants products.read", async ({ context, page }) => {
    await grantPermission(page, context, admin, target, "products.read");
    await snap(page, "admin-regranted-products-read");
  });

  // ─── PAYMENTS: revoke seller_payment_methods.read → empty ───

  test("Phase 10: admin revokes seller_payment_methods.read", async ({
    context,
    page,
  }) => {
    await revokePermission(
      page,
      context,
      admin,
      target,
      "seller_payment_methods.read",
    );
    await snap(page, "admin-revoked-payment-methods-read");
  });

  test("Phase 11: target blocked — Payment methods empty", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("payment-methods-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-blocked");
  });

  test("Phase 12: admin re-grants seller_payment_methods.read", async ({
    context,
    page,
  }) => {
    await grantPermission(
      page,
      context,
      admin,
      target,
      "seller_payment_methods.read",
    );
    await snap(page, "admin-regranted-payment-methods-read");
  });

  // ─── ADMIN: revoke products.read → verify via admin panel ──

  test("Phase 13: admin revokes products.delete", async ({ context, page }) => {
    await revokePermission(page, context, admin, target, "products.delete");
    await snap(page, "admin-revoked-products-delete");
  });

  test("Phase 14: admin panel shows products.delete unchecked", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await searchAndSelectUser(page, target.email, target.userId);

    // Verify the revoked permission is still unchecked after reload
    await expect(
      page.getByTestId("permission-toggle-products.delete"),
    ).not.toBeChecked();
    await snap(page, "admin-products-delete-still-revoked");
  });

  test("Phase 15: admin re-grants products.delete", async ({
    context,
    page,
  }) => {
    await grantPermission(page, context, admin, target, "products.delete");
    await snap(page, "admin-regranted-products-delete");
  });

  // ─── NUKE: apply "None" template → everything blocked ───────

  test("Phase 16: admin applies None template — revoke all", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await searchAndSelectUser(page, target.email, target.userId);
    await snap(page, "admin-before-none-template");

    await page.getByTestId("template-btn-none").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "admin-after-none-template");

    // Verify key permissions all unchecked
    for (const key of [
      "products.create",
      "products.read",
      "orders.create",
      "orders.read",
      "audit.read",
      "user_permissions.read",
    ]) {
      await expect(
        page.getByTestId(`permission-toggle-${key}`),
      ).not.toBeChecked();
    }
  });

  test("Phase 17: fully blocked — Studio empty", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("products-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-fully-blocked");
  });

  test("Phase 18: fully blocked — Payment methods empty", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("payment-methods-empty-state")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "payment-methods-fully-blocked");
  });

  test("Phase 19: fully blocked — Admin permissions panel confirms", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await searchAndSelectUser(page, target.email, target.userId);

    // Verify all key permissions are unchecked
    await expect(
      page.getByTestId("permission-toggle-products.read"),
    ).not.toBeChecked();
    await expect(
      page.getByTestId("permission-toggle-orders.read"),
    ).not.toBeChecked();
    await snap(page, "admin-panel-all-unchecked");
  });

  test("Phase 20: fully blocked — Store still public", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STORE}/en`);
    await page.waitForLoadState("networkidle");

    // Store is public — catalog always loads
    await expect(page.getByTestId("product-catalog-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "store-still-public");
  });

  // ─── RESTORE: apply Seller template → partial access back ───

  test("Phase 21: admin applies Seller template", async ({ context, page }) => {
    await injectSession(context, admin);
    await searchAndSelectUser(page, target.email, target.userId);

    await page.getByTestId("template-btn-seller").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);
    await snap(page, "admin-seller-template-applied");

    // Seller has products.create but NOT audit.read
    await expect(
      page.getByTestId("permission-toggle-products.create"),
    ).toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
    await expect(
      page.getByTestId("permission-toggle-audit.read"),
    ).not.toBeChecked();
  });

  test("Phase 22: seller restored — Studio access back", async ({
    context,
    page,
  }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("new-product-button")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "studio-restored-as-seller");
  });

  test("Phase 23: seller permissions — admin confirms audit.read unchecked", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await searchAndSelectUser(page, target.email, target.userId);

    // Seller template does NOT include audit.read
    await expect(
      page.getByTestId("permission-toggle-audit.read"),
    ).not.toBeChecked();
    // But seller HAS products.create
    await expect(
      page.getByTestId("permission-toggle-products.create"),
    ).toBeChecked();
    await snap(page, "admin-seller-template-no-audit");
  });
});
