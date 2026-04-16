import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

/**
 * Create a screenshot helper bound to a specific output directory.
 * Screenshots are only written when E2E_SCREENSHOTS=true is set in the environment.
 * Returns a `snap` function and a `resetCounter` to call in beforeAll.
 */
export function createSnapHelper(screenshotsDir: string) {
  const enabled = process.env.E2E_SCREENSHOTS === "true";

  if (enabled) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let stepCounter = 0;

  async function snap(page: Page, label: string): Promise<void> {
    stepCounter++;
    if (!enabled) return;
    const filename = `${String(stepCounter).padStart(2, "0")}-${label}.png`;
    await page.screenshot({
      path: path.join(screenshotsDir, filename),
      fullPage: true,
    });
  }

  function resetCounter(): void {
    stepCounter = 0;
  }

  return { snap, resetCounter };
}
