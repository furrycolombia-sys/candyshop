import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
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
      thresholds: {
        global: { branches: 85, functions: 85, lines: 85, statements: 85 },
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
