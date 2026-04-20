import { expect, test } from "@playwright/test";

import { ELEMENT_TIMEOUT_MS } from "../../../auth/e2e/helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../../auth/e2e/helpers/session";

test.describe("Users Page", () => {
  let adminUser: TestUser;

  test.beforeAll(async () => {
    adminUser = await createTestUser("admin-users-page", [
      ...ADMIN_PERMISSIONS,
      "users.export",
    ]);
  });

  test.afterAll(async () => {
    await supabaseAdmin.auth.admin.deleteUser(adminUser.userId);
  });

  test("should display users table and export button", async ({
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

    await expect(page.getByTestId("users-search-input")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    await expect(page.getByTestId("users-export-excel-button")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });
  });
});
