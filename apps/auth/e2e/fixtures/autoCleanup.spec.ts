import { expect, test as base } from "@playwright/test";

import {
  drainTestUsers,
  listRegisteredTestUsers,
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
