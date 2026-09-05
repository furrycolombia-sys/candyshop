import { deleteTestUser, type TestUser } from "./session";

const registry: TestUser[] = [];

/** Record a created test user so worker teardown can remove it. Called by
 * `createTestUser` itself — specs never call this directly, which is the
 * point: cleanup cannot be forgotten because it is not a caller's job. */
export function registerTestUser(user: TestUser): void {
  registry.push(user);
}

export function listRegisteredTestUsers(): readonly TestUser[] {
  return registry;
}

interface DrainOptions {
  deleter?: (user: TestUser) => Promise<void>;
}

/**
 * Delete every registered user and empty the registry. Never throws: one
 * failed deletion must not strand the rest. Returns the number attempted.
 */
export async function drainTestUsers(
  options: DrainOptions = {},
): Promise<number> {
  const deleter = options.deleter ?? deleteTestUser;
  const pending = registry.splice(0, registry.length);

  for (const user of pending) {
    try {
      await deleter(user);
    } catch (error) {
      console.warn(`[e2e] drain failed for ${user.email}:`, error);
    }
  }

  return pending.length;
}
