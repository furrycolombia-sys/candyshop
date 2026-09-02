import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@auth": path.resolve(__dirname, "./src"),
            shared: path.resolve(__dirname, "../shared/src"),
            "@shared": path.resolve(__dirname, "../shared/src"),
          },
        },
        test: {
          name: "node",
          environment: "node",
          globals: true,
          include: ["tests/node/**/*.test.{ts,tsx}"],
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
        resolve: {
          alias: {
            "@auth": path.resolve(__dirname, "./src"),
            shared: path.resolve(__dirname, "../shared/src"),
            "@shared": path.resolve(__dirname, "../shared/src"),
          },
        },
        test: {
          name: "jsdom",
          environment: "jsdom",
          globals: true,
          include: ["tests/client/**/*.test.{ts,tsx}"],
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
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      // The tests moved out of src/, so a relative import no longer reaches
      // the module under test. They address it by the package's own alias --
      // which tsconfig already declared, but vitest resolves separately.
      "@auth": path.resolve(__dirname, "./src"),
      shared: path.resolve(__dirname, "../shared/src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
