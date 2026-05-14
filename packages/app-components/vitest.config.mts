import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
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
        branches: 85, functions: 85, lines: 85, statements: 85,
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@app-components": path.resolve(__dirname, "./src"),
      shared: path.resolve(__dirname, "../shared/src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      ui: path.resolve(__dirname, "../ui/src"),
      "@ui": path.resolve(__dirname, "../ui/src"),
    },
  },
});
