import path from "node:path";

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
    include: ["tests/**/*.test.{ts,tsx}"],
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
      // Below the repo's 85 target, and pinned just under measured coverage
      // so the numbers can only go up. Measured 78.57 / 71.42 / 86.04 / 81.25;
      // the previous values sat as much as eleven points under that, which
      // left room to lose coverage without the gate noticing.
      thresholds: {
        branches: 78,
        functions: 71,
        lines: 86,
        statements: 81,
      },
      cleanOnRerun: false,
    },
  },
  resolve: {
    alias: {
      // The tests moved out of src/, so they address the package by its own
      // alias. tsconfig already declared it; vitest resolves separately.
      "@api": path.resolve(__dirname, "./src"),
    },
  },
});
