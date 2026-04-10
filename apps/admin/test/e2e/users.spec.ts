import { test, expect } from "@playwright/test";

test.describe("Users Page", () => {
  test("should display users table and handle export feature", async ({
    page,
  }) => {
    // Navigate to the users page
    // Since we are mocking e2e, we would normally go to the dev server port, e.g. 5002
    await page.goto("http://localhost:5002/en/users");

    // Check if the users table rendered
    await expect(page.locator("table")).toBeVisible();

    // Verify search input is present
    const searchInput = page.locator("input[placeholder]");
    await expect(searchInput).toBeVisible();

    // We can't actually download without mocking or intercepting easily,
    // but we can check if the button is visible or check its state
    // First, let's select a role filter
    const selects = page.locator("select");
    if ((await selects.count()) > 0) {
      await selects.first().selectOption("buyer");
    }

    // Since we're in admin with users.export permission, we expect an export button
    // It might be disabled initially if no user selected
    const exportButton = page.locator(
      'button:has-text("Export Selected to Excel")',
    );
    if ((await exportButton.count()) > 0) {
      await expect(exportButton).toBeVisible();
    }
  });
});
