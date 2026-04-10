import { expect, test } from "@playwright/test";

const LANDING_URL = "http://localhost:5004/en";

test.describe("Landing navbar auth state", () => {
  test("does not show app links while signed out", async ({ page }) => {
    await page.goto(LANDING_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("app-navigation")).toBeVisible();
    await expect(page.getByTestId(/^nav-link-/)).toHaveCount(0);
  });
});
