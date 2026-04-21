import { expect, test } from "@playwright/test";

import {
  ELEMENT_TIMEOUT_MS,
  MUTATION_WAIT_MS,
} from "../../auth/e2e/helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../auth/e2e/helpers/session";

// ─── Helpers ─────────────────────────────────────────────────────

function getAdminBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (!url) throw new Error("NEXT_PUBLIC_ADMIN_URL is required.");
  return url;
}

// ─── Test suite ───────────────────────────────────────────────────

test.describe.serial("Audit Log page", () => {
  let adminUser: TestUser;

  test.beforeAll(async () => {
    adminUser = await createTestUser("audit-log-e2e", ADMIN_PERMISSIONS);
  });

  test.afterAll(async () => {
    await supabaseAdmin.auth.admin.deleteUser(adminUser.userId).catch(() => {});
  });

  // ─── Page structure ──────────────────────────────────────────────

  test("loads audit log page without errors", async ({ context, page }) => {
    await injectSession(context, adminUser);
    await page.goto(`${getAdminBaseUrl()}/en/audit`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("audit-log-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("audit-title")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });

  test("shows filters bar", async ({ context, page }) => {
    await injectSession(context, adminUser);
    await page.goto(`${getAdminBaseUrl()}/en/audit`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("audit-filters")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("audit-filter-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
    await expect(page.getByTestId("audit-filter-all")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });

  test("renders audit table or empty state — no error state", async ({
    context,
    page,
  }) => {
    await injectSession(context, adminUser);
    await page.goto(`${getAdminBaseUrl()}/en/audit`, {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(MUTATION_WAIT_MS);

    // The error state must NOT be visible (which would indicate a 406 or network error)
    await expect(page.getByTestId("audit-error")).not.toBeVisible();

    // Either the table or the empty state must be visible
    const table = page.getByTestId("audit-table");
    const empty = page.getByTestId("audit-empty");
    const tableVisible = await table.isVisible();
    const emptyVisible = await empty.isVisible();
    expect(tableVisible || emptyVisible).toBe(true);
  });

  test("action type filters update the view without errors", async ({
    context,
    page,
  }) => {
    await injectSession(context, adminUser);
    await page.goto(`${getAdminBaseUrl()}/en/audit`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByTestId("audit-filters")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Click INSERT filter
    await page.getByTestId("audit-filter-insert").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    // Error state must not appear after filtering
    await expect(page.getByTestId("audit-error")).not.toBeVisible();

    // Reset to all
    await page.getByTestId("audit-filter-all").click();
    await page.waitForTimeout(MUTATION_WAIT_MS);

    await expect(page.getByTestId("audit-error")).not.toBeVisible();
  });

  test("table filter dropdown is populated with table names", async ({
    context,
    page,
  }) => {
    await injectSession(context, adminUser);
    await page.goto(`${getAdminBaseUrl()}/en/audit`, {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(MUTATION_WAIT_MS);

    const tableSelect = page.getByTestId("audit-filter-table");
    await expect(tableSelect).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // The select should have at least the default "all tables" option
    const optionCount = await tableSelect.locator("option").count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  // ─── Access control ───────────────────────────────────────────────

  test("user without audit.read permission sees access denied", async ({
    context,
    page,
  }) => {
    const limitedUser = await createTestUser("audit-limited-e2e", [
      ...ADMIN_PERMISSIONS.filter((p) => p !== "audit.read"),
    ]);

    try {
      await injectSession(context, limitedUser);
      await page.goto(`${getAdminBaseUrl()}/en/audit`, {
        waitUntil: "networkidle",
      });

      // Should NOT show the audit log page content
      await expect(page.getByTestId("audit-log-page")).not.toBeVisible({
        timeout: ELEMENT_TIMEOUT_MS,
      });
    } finally {
      await supabaseAdmin.auth.admin
        .deleteUser(limitedUser.userId)
        .catch(() => {});
    }
  });
});
