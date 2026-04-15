import path from "node:path";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

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

const ALL_APP_PERMISSIONS = [
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
  "orders.create",
  "orders.read",
  "orders.update",
  "receipts.create",
  "receipts.read",
  "receipts.delete",
  "seller_payment_methods.create",
  "seller_payment_methods.read",
  "seller_payment_methods.update",
  "seller_payment_methods.delete",
  "payment_settings.read",
  "payment_settings.update",
  "templates.create",
  "templates.read",
  "templates.update",
  "templates.delete",
  "audit.read",
  "user_permissions.create",
  "user_permissions.read",
  "user_permissions.update",
  "user_permissions.delete",
  "events.create",
  "events.read",
  "events.update",
  "events.delete",
  "check_ins.create",
  "check_ins.read",
  "check_ins.update",
] as const;

async function navigateToUserDetail(
  page: Page,
  targetEmail: string,
  targetUserId: string,
): Promise<void> {
  await page.goto(`${APP_URLS.ADMIN}/en/users`);
  await expect(page.getByTestId("users-page")).toBeVisible({
    timeout: ELEMENT_TIMEOUT_MS,
  });

  await page.getByTestId("users-search-input").fill(targetEmail);
  await page.waitForTimeout(DEBOUNCE_WAIT_MS);
  await page.getByTestId(`user-row-${targetUserId}`).click();

  await expect(page.getByTestId("user-detail-page")).toBeVisible({
    timeout: ELEMENT_TIMEOUT_MS,
  });
}

async function setPermissions(
  page: Page,
  context: BrowserContext,
  admin: TestUser,
  target: TestUser,
  updates: Record<string, boolean>,
): Promise<void> {
  await injectSession(context, admin);
  await navigateToUserDetail(page, target.email, target.userId);

  for (const [permissionKey, desired] of Object.entries(updates)) {
    const checkbox = page.getByTestId(`permission-toggle-${permissionKey}`);
    await expect(checkbox).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    const current = await checkbox.isChecked();
    if (current !== desired) {
      await checkbox.click();
      await page.waitForTimeout(MUTATION_WAIT_MS);
    }

    if (desired) {
      await expect(checkbox).toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
    } else {
      await expect(checkbox).not.toBeChecked({ timeout: ELEMENT_TIMEOUT_MS });
    }
  }
}

async function expectVisible(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).toBeVisible({
    timeout: ELEMENT_TIMEOUT_MS,
  });
}

async function expectHidden(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).toHaveCount(0, {
    timeout: ELEMENT_TIMEOUT_MS,
  });
}

test.describe.serial("Permission management", () => {
  let admin: TestUser;
  let target: TestUser;

  test.beforeAll(async () => {
    resetCounter();
    admin = await createTestUser("permissions-admin", ADMIN_PERMISSIONS);
    target = await createTestUser("permissions-target", ADMIN_PERMISSIONS);
  });

  test.afterAll(async () => {
    if (admin && target) {
      await cleanupTestData(admin.userId, target.userId);
    }
  });

  test("shows the full permission matrix in admin", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);

    for (const permissionKey of ALL_APP_PERMISSIONS) {
      await expect(
        page.getByTestId(`permission-toggle-${permissionKey}`),
      ).toBeVisible({
        timeout: ELEMENT_TIMEOUT_MS,
      });
    }

    await snap(page, "permissions-matrix");
  });

  test("turns studio permissions off and on", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectVisible(page, "new-product-button");
    await snap(page, "studio-baseline");

    await setPermissions(page, context, admin, target, {
      "products.create": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectHidden(page, "new-product-button");
    await snap(page, "studio-create-hidden");

    // Clear cookies and re-inject session to force a completely fresh auth state,
    // then navigate to the create page to verify access-denied
    await context.clearCookies();
    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en/products/new`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "access-denied");

    await setPermissions(page, context, admin, target, {
      "products.create": true,
      "products.read": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectVisible(page, "access-denied");
    await snap(page, "studio-read-blocked");

    await setPermissions(page, context, admin, target, {
      "products.read": true,
      "products.create": true,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectVisible(page, "new-product-button");
    await snap(page, "studio-restored");
  });

  test("turns payments sections off and on", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await expectVisible(page, "sidebar-checkout");
    await expectVisible(page, "sidebar-myPurchases");
    await expectVisible(page, "sidebar-paymentMethods");
    await expectVisible(page, "sidebar-sales");
    await snap(page, "payments-baseline");

    await setPermissions(page, context, admin, target, {
      "seller_payment_methods.read": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await expectVisible(page, "sidebar-myPurchases");
    await expectHidden(page, "sidebar-paymentMethods");
    await snap(page, "payments-methods-hidden");

    await context.clearCookies();
    await injectSession(context, target);
    // Navigate to a different app first to fully reset the Next.js router cache
    // and force the Supabase client to re-initialize on the payments app
    await page.goto(`${APP_URLS.AUTH}/en`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${APP_URLS.PAYMENTS}/en/payment-methods`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "access-denied");

    await setPermissions(page, context, admin, target, {
      "seller_payment_methods.read": true,
      "orders.create": false,
      "receipts.create": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await expectVisible(page, "sidebar-myPurchases");
    await expectHidden(page, "sidebar-checkout");
    await snap(page, "payments-checkout-hidden");

    await context.clearCookies();
    await injectSession(context, target);
    await page.goto(`${APP_URLS.AUTH}/en`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "access-denied");

    await setPermissions(page, context, admin, target, {
      "orders.create": true,
      "receipts.create": true,
      "orders.update": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/purchases`);
    await expectVisible(page, "sidebar-myPurchases");
    await expectHidden(page, "sidebar-sales");
    await snap(page, "payments-sales-hidden");

    await context.clearCookies();
    await injectSession(context, target);
    await page.goto(`${APP_URLS.AUTH}/en`);
    await page.waitForLoadState("networkidle");
    await page.goto(`${APP_URLS.PAYMENTS}/en/sales`);
    await page.waitForLoadState("networkidle");
    await expectVisible(page, "access-denied");

    await setPermissions(page, context, admin, target, {
      "seller_payment_methods.read": true,
      "orders.create": true,
      "receipts.create": true,
      "orders.update": true,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await expectVisible(page, "sidebar-checkout");
    await expectVisible(page, "sidebar-paymentMethods");
    await expectVisible(page, "sidebar-sales");
    await snap(page, "payments-restored");
  });

  test("turns admin sections off and on", async ({ context, page }) => {
    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en`);
    await expectVisible(page, "sidebar-templates");
    await expectVisible(page, "sidebar-auditLog");
    await expectVisible(page, "sidebar-users");
    await expectVisible(page, "sidebar-settings");
    await snap(page, "admin-baseline");

    await setPermissions(page, context, admin, target, {
      "templates.read": false,
      "audit.read": false,
      "user_permissions.read": false,
      "payment_settings.read": false,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en`);
    await expectVisible(page, "access-denied");
    await snap(page, "admin-all-sections-hidden");

    await page.goto(`${APP_URLS.ADMIN}/en/users`);
    await expectVisible(page, "access-denied");

    await page.goto(`${APP_URLS.ADMIN}/en/templates`);
    await expectVisible(page, "access-denied");

    await page.goto(`${APP_URLS.ADMIN}/en/audit`);
    await expectVisible(page, "access-denied");

    await page.goto(`${APP_URLS.ADMIN}/en/settings`);
    await expectVisible(page, "access-denied");

    await setPermissions(page, context, admin, target, {
      "templates.read": true,
      "audit.read": true,
      "user_permissions.read": true,
      "payment_settings.read": true,
    });

    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en`);
    await expectVisible(page, "sidebar-templates");
    await expectVisible(page, "sidebar-auditLog");
    await expectVisible(page, "sidebar-users");
    await expectVisible(page, "sidebar-settings");
    await snap(page, "admin-restored");
  });

  test("applies none and admin templates cleanly", async ({
    context,
    page,
  }) => {
    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);
    await page.getByTestId("template-btn-none").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("permission-toggle-products.read"),
    ).not.toBeChecked();
    await expect(
      page.getByTestId("permission-toggle-user_permissions.read"),
    ).not.toBeChecked();
    await snap(page, "template-none-applied");

    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en`);
    await expectVisible(page, "access-denied");
    await expectHidden(page, "nav-link-admin");
    await expectHidden(page, "nav-link-payments");
    await expectHidden(page, "nav-link-studio");
    await expectVisible(page, "nav-link-landing");
    await expectVisible(page, "nav-link-store");
    await expectVisible(page, "nav-link-auth");
    await expectVisible(page, "nav-link-playground");

    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await expectVisible(page, "access-denied");

    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectVisible(page, "access-denied");
    await snap(page, "all-apps-blocked");

    await injectSession(context, admin);
    await navigateToUserDetail(page, target.email, target.userId);
    await page.getByTestId("template-btn-admin").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(
      page.getByTestId("permission-toggle-products.read"),
    ).toBeChecked({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(
      page.getByTestId("permission-toggle-user_permissions.read"),
    ).toBeChecked({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await snap(page, "template-admin-restored");

    await injectSession(context, target);
    await page.goto(`${APP_URLS.ADMIN}/en`);
    await expectVisible(page, "sidebar-users");
    await expectVisible(page, "nav-link-admin");
    await expectVisible(page, "nav-link-payments");
    await expectVisible(page, "nav-link-studio");

    await page.goto(`${APP_URLS.PAYMENTS}/en/checkout`);
    await expectVisible(page, "sidebar-checkout");

    await page.goto(`${APP_URLS.STUDIO}/en`);
    await expectVisible(page, "new-product-button");
    await snap(page, "all-apps-restored");
  });
});
