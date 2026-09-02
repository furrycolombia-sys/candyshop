import { test as base, type BrowserContext } from "@playwright/test";

import {
  createTestUser,
  deleteTestUser,
  injectSession,
} from "../helpers/session";

/**
 * Create a test user (Clerk identity + linked `user_profiles` row + default
 * buyer permissions — see `createTestUser`'s doc comment) and drive a real
 * Clerk sign-in for it into the given browser context.
 */
async function createAuthenticatedSession(context: BrowserContext) {
  const user = await createTestUser("smoke");
  await injectSession(context, user);

  return {
    userId: user.userId,
    email: user.email,
    cleanup: async () => {
      await deleteTestUser(user);
    },
  };
}

/**
 * Extended test fixture with authenticated user.
 */
export const test = base.extend<{
  authenticatedPage: {
    userId: string;
    email: string;
  };
}>({
  authenticatedPage: async ({ context }, use) => {
    const { userId, email, cleanup } =
      await createAuthenticatedSession(context);

    await use({ userId, email });

    // Cleanup: delete test user after test
    await cleanup();
  },
});

export { expect } from "@playwright/test";
