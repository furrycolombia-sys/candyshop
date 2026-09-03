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
 *
 * The waits below are deliberate and are not the usual "wait for the network"
 * anti-pattern this repo removes elsewhere. @hello-pangea/dnd drives a
 * state machine of its own between keystrokes -- lift, move, drop each run an
 * animation and a screen-reader announcement -- and it drops keystrokes that
 * arrive mid-transition. There is no assertion to anchor on here: the helper
 * has no idea what the caller expects to change, so it cannot wait for it.
 * The caller asserts the outcome instead.
 *
 * Replacing these with the library's own drag signals (the placeholder node
 * it mounts while a drag is live) is plausible but unverified -- it needs the
 * e2e suite to confirm, and a wrong guess here breaks reordering coverage
 * silently rather than loudly. Left as-is on purpose, disabled with a reason
 * rather than left to sit in a warning list where it reads as unexamined.
 */
/* eslint-disable playwright/no-wait-for-timeout -- see the note above:
   these pace a third-party drag state machine, not a network operation. */
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
