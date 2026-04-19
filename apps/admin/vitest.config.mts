import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { createVitestAliases } from "../../vitest.aliases";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
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
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/",
        ".next/**",
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
      ...createVitestAliases(__dirname),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
});
