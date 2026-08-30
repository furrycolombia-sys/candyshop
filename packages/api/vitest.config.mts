import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    allowOnly: false,
    bail: 0,
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
      // This package had no thresholds and no `test:coverage` script, so its
      // coverage was never measured or enforced. Floors pinned to the first real
      // measurement so regressions fail; raise them as coverage improves.
      thresholds: {
        branches: 75, functions: 60, lines: 80, statements: 75,
      },
      cleanOnRerun: false,
    },
  },
});
