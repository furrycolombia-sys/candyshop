import { expect, test } from "@playwright/test";

import { ELEMENT_TIMEOUT_MS } from "../../../auth/e2e/helpers/constants";
import {
  ADMIN_PERMISSIONS,
  createTestUser,
  deleteTestUser,
  injectSession,
  type TestUser,
} from "../../../auth/e2e/helpers/session";

// Read at module scope, not inside the test. A missing base URL is a broken
// run configuration, not a case the test is meant to branch on -- hoisting it
// makes the whole file fail at collection instead of part-way through a test,
// and keeps the test body free of the conditional the linter objects to.
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL;
if (!ADMIN_BASE_URL) {
  throw new Error("NEXT_PUBLIC_ADMIN_URL is required for this e2e test.");
}

test.describe("Users Page", () => {
  let adminUser: TestUser;

  test.beforeAll(async () => {
    adminUser = await createTestUser("admin-users-page", [
      ...ADMIN_PERMISSIONS,
      "users.export",
    ]);
  });

  test.afterAll(async () => {
    await deleteTestUser(adminUser);
  });

  test("should display users table and export button", async ({
    context,
    page,
  }) => {
    await injectSession(context, adminUser);

    // No wait needed: the next assertion is positive and retrying, so it
    // already waits for the page to render.
    await page.goto(`${ADMIN_BASE_URL}/en/users`);

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
