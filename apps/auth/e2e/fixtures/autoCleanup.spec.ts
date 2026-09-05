import { expect, test as base } from "@playwright/test";

import {
  drainTestUsers,
  listRegisteredTestUsers,
  registerClerkUser,
  registerTestUser,
} from "../helpers/userRegistry";
import type { TestUser } from "../helpers/session";

const fakeUser = (id: string): TestUser => ({
  userId: id,
  email: `e2e-${id}+clerk_test@example.com`,
  clerkUserId: `user_${id}`,
  accessToken: "not-used",
});

base("registry accumulates and drains", async () => {
  registerTestUser(fakeUser("a"));
  registerTestUser(fakeUser("b"));
  expect(listRegisteredTestUsers()).toHaveLength(2);

  const drained = await drainTestUsers({ deleter: async () => {} });

  expect(drained).toBe(2);
  expect(listRegisteredTestUsers()).toHaveLength(0);
});

base("drain continues past a failing deletion", async () => {
  registerTestUser(fakeUser("a"));
  registerTestUser(fakeUser("b"));

  const drained = await drainTestUsers({
    deleter: async (u) => {
      if (u.userId === "a") throw new Error("boom");
    },
  });

  expect(drained).toBe(2);
  expect(listRegisteredTestUsers()).toHaveLength(0);
});

// Regression test for the finding in fix round 1: registration used to
// happen only once the full TestUser was assembled, after the profile RPC,
// permission grants, and session/token minting had all already succeeded.
// A throw anywhere in that window (the RPC failing, as it did on the local
// stack with user_permissions_granted_by_fkey, is a real example) left the
// just-created Clerk user unregistered and therefore un-drainable -- exactly
// the "throws inside beforeAll" leak this task exists to close. A
// profile-less entry (created via registerClerkUser, the way createTestUser
// registers before the profile RPC runs) must still have its Clerk user
// deleted by drain, via the clerkDeleter fallback, without ever calling the
// profile deleter.
base("drains a profile-less entry via the Clerk-only fallback", async () => {
  registerClerkUser({
    clerkUserId: "user_c",
    email: "e2e-c+clerk_test@example.com",
  });
  expect(listRegisteredTestUsers()).toEqual([
    { clerkUserId: "user_c", email: "e2e-c+clerk_test@example.com" },
  ]);

  let profileDeleterCalled = false;
  const deletedClerkIds: string[] = [];

  const drained = await drainTestUsers({
    deleter: async () => {
      profileDeleterCalled = true;
    },
    clerkDeleter: async (clerkUserId) => {
      deletedClerkIds.push(clerkUserId);
    },
  });

  expect(drained).toBe(1);
  expect(deletedClerkIds).toEqual(["user_c"]);
  expect(profileDeleterCalled).toBe(false);
  expect(listRegisteredTestUsers()).toHaveLength(0);
});
