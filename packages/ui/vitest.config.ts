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
        // shadcn/ui compound components — generated third-party code, not unit-tested
        "src/components/dropdown-menu.tsx",
        "src/components/sheet.tsx",
        "src/components/popover.tsx",
        "src/components/scroll-area.tsx",
        "src/components/slider.tsx",
        "src/components/resizable.tsx",
        "src/components/area-chart.tsx",
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
      "@ui": path.resolve(__dirname, "./src"),
      // Resolve shared package for imports
      shared: path.resolve(__dirname, "../shared/src"),
      // Resolve @shared alias used within shared package
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
  },
});
