import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    exclude: [
      "node_modules/",
      "src/test/",
      "**/*.d.ts",
      "**/*.config.*",
      "**/index.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
        "src/shared/infrastructure/i18n/messages/**",
        "src/shared/infrastructure/i18n/request.ts",
        "src/shared/infrastructure/i18n/routing.ts",
        "src/shared/infrastructure/config/**",
        "src/shared/infrastructure/providers/**",
        "src/mocks/**",
        "src/app/**",
        "src/proxy.ts",
        "e2e/**",
        "public/**",
        "**/*.spec.ts",
        "**/domain/types.ts",
        "**/domain/types/**",
        // Type-only file: pure interface definitions for product gallery
        "**/domain/galleryTypes.ts",
        // Supabase auth shim — thin wrappers around Supabase SDK, tested via integration/E2E
        "**/auth/application/hooks/useSupabaseAuth.ts",
        "**/auth/presentation/components/ProtectedRoute.tsx",
      ],
      cleanOnRerun: false,
      thresholds: {
        global: { branches: 85, functions: 85, lines: 85, statements: 85 },
      },
    },
    testTimeout: 10_000,
    hookTimeout: 10_000,
    allowOnly: false,
    bail: 0,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@api": path.resolve(__dirname, "../../packages/api/src"),
      "@app-components": path.resolve(
        __dirname,
        "../../packages/app-components/src",
      ),
      shared: path.resolve(__dirname, "../../packages/shared/src"),
      ui: path.resolve(__dirname, "../../packages/ui/src"),
      api: path.resolve(__dirname, "../../packages/api/src"),
      "@monorepo/app-components": path.resolve(
        __dirname,
        "../../packages/app-components/src",
      ),
    },
  },
});
