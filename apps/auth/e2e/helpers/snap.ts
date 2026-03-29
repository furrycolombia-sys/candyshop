import fs from "node:fs";
import path from "node:path";

import type { Page } from "@playwright/test";

/**
 * Create a screenshot helper bound to a specific output directory.
 * Returns a `snap` function and a `resetCounter` to call in beforeAll.
 */
export function createSnapHelper(screenshotsDir: string) {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  let stepCounter = 0;

  async function snap(page: Page, label: string): Promise<void> {
    stepCounter++;
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
