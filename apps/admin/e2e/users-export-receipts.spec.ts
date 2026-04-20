import { expect, test } from "@playwright/test";

import { ELEMENT_TIMEOUT_MS } from "../../auth/e2e/helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../auth/e2e/helpers/session";

test.describe.serial("users export excel download", () => {
  let adminUser: TestUser;

  test.beforeAll(async () => {
    adminUser = await createTestUser("admin-export-excel", [
      ...ADMIN_PERMISSIONS,
      "users.export",
    ]);
  });

  test.afterAll(async () => {
    await supabaseAdmin.auth.admin.deleteUser(adminUser.userId);
  });

  test("downloads excel file when export button is clicked", async ({
    context,
    page,
  }) => {
    const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
    if (!adminBaseUrl) {
      throw new Error("NEXT_PUBLIC_ADMIN_URL is required for this e2e test.");
    }

    await injectSession(context, adminUser);

    await page.goto(`${adminBaseUrl}/en/users`, { waitUntil: "networkidle" });

    await expect(page.getByTestId("users-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(page.getByTestId("users-table")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    // Select the first user row checkbox so the export button becomes active
    const firstCheckbox = page
      .getByTestId("users-table-element")
      .locator('input[type="checkbox"]')
      .first();
    await firstCheckbox.check();

    const exportButton = page.getByTestId("users-export-excel-button");
    await expect(exportButton).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xls$/i);
  });
});
