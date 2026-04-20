import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "node",
          environment: "node",
          globals: true,
          include: [
            "src/domain/**/*.test.{ts,tsx}",
            "src/server/**/*.test.{ts,tsx}",
          ],
          exclude: [
            "node_modules/",
            "**/*.d.ts",
            "**/*.config.*",
            "**/index.ts",
          ],
          testTimeout: 10_000,
          hookTimeout: 10_000,
          allowOnly: false,
          bail: 0,
        },
      },
      {
        plugins: [react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true,
          include: ["src/client/**/*.test.{ts,tsx}"],
          exclude: [
            "node_modules/",
            "**/*.d.ts",
            "**/*.config.*",
            "**/index.ts",
          ],
          testTimeout: 10_000,
          hookTimeout: 10_000,
          allowOnly: false,
          bail: 0,
        },
      },
    ],
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
  },
});
