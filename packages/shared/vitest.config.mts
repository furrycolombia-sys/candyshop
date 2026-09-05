import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
      ],
      cleanOnRerun: false,
      // Enforced floors, not aspirations. These thresholds existed for a long
      // time but never ran: this package had no `test:coverage` script, so turbo
      // skipped it silently. On first real measurement branches was 78.47%.
      // The floor is pinned just under that so a regression fails, and should be
      // ratcheted back up to 85 as branch coverage improves.
      // branches is below the repo's 85 target; the rest are pinned just under
      // measured coverage (87.12 / 78.47 / 92.53 / 90.43) rather than left at
      // the target, so the slack above 85 cannot be spent silently.
      thresholds: {
        branches: 78,
        functions: 92,
        lines: 90,
        statements: 87,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./src"),
    },
  },
});
