import { defineConfig } from "vitest/config";

/**
 * Database integration suite.
 *
 * Separate from the unit suites because it needs a running Postgres and is
 * therefore not something `pnpm test` should silently require. Run it with
 * `pnpm test:db`, which resets the database first so the suite starts from the
 * migrations rather than from whatever the last run left behind.
 */
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    // These share one connection pool and roll their transactions back; running
    // files in parallel against the same pool makes failures order-dependent.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
