import { test, expect } from "@playwright/test";

/**
 * Smoke tests — run against a built Docker container via docker-health-check.sh.
 * CONTAINER_URL env var is set by the script to point at the running container.
 */

const baseUrl = process.env.CONTAINER_URL ?? "http://localhost:8088";

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get(`${baseUrl}/store/health`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

test("store home page loads", async ({ page }) => {
  await page.goto(`${baseUrl}/store/en`);
  await expect(page).not.toHaveURL(/error/);
  await expect(page.locator("body")).toBeVisible();
});
