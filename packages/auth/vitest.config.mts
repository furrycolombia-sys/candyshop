import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
      cleanOnRerun: false,
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
    allowOnly: false,
    bail: 0,
  },
});
