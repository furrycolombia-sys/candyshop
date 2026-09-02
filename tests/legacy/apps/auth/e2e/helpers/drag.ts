import type { Locator, Page } from "@playwright/test";

/**
 * Simulate drag-and-drop for @hello-pangea/dnd using keyboard controls.
 *
 * @hello-pangea/dnd supports keyboard-based reordering:
 * 1. Focus the drag handle
 * 2. Press Space to lift the item
 * 3. Press ArrowUp/ArrowDown (vertical) or ArrowLeft/ArrowRight (horizontal)
 * 4. Press Space to drop it
 *
 * This is more reliable than mouse simulation in headless browsers
 * because it doesn't depend on precise pixel coordinates or timing.
 *
 * @param page - Playwright page
 * @param handle - The drag handle locator (the element with dragHandleProps)
 * @param direction - Direction to move: "up"/"down" for vertical droppables,
 *                    "left"/"right" for horizontal droppables (e.g. cards section)
 * @param positions - Number of positions to move (default: 1)
 */
export async function dragAndDrop(
  page: Page,
  handle: Locator,
  direction: "up" | "down" | "left" | "right",
  positions = 1,
): Promise<void> {
  // Focus the drag handle
  await handle.focus();
  await page.waitForTimeout(100);

  // Press Space to lift the item
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);

  // Press arrow key to move
  const keyMap = {
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
  } as const;
  for (let i = 0; i < positions; i++) {
    await page.keyboard.press(keyMap[direction]);
    await page.waitForTimeout(200);
  }

  // Press Space to drop
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
}
