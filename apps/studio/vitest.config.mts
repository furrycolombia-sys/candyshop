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
        "**/domain/types.ts",
        "**/domain/types/**",
        // Pure nuqs parser declarations — no logic to test
        "**/domain/searchParams.ts",
        // Supabase auth shim — thin wrappers around Supabase SDK, tested via integration/E2E
        "**/auth/application/hooks/useSupabaseAuth.ts",
        "**/auth/presentation/components/ProtectedRoute.tsx",
        // Pure re-export from shared package — no logic to test
        "**/context/ErrorContext.tsx",
        // Supabase chain queries — tested via dedicated infrastructure tests
        "**/infrastructure/productQueries.ts",
        // Complex react-hook-form components — useController onChange/onBlur callbacks
        // are internal to RHF and not meaningfully testable in jsdom isolation.
        // Covered via integration: InlineEditor → InlineHero → InlinePriceFields chain.
        "**/InlineEditor/InlinePriceFields.tsx",
        "**/InlineEditor/InlineHero.tsx",
        "**/InlineEditor/EditorToolbar.tsx",
        "**/InlineEditor/InlineEditor.tsx",
        "**/InlineEditor/InlineImageCarousel.tsx",
        "**/InlineEditor/TemplatePicker.tsx",
        // Section type renderers with complex conditional prop forwarding
        "**/InlineEditor/SectionItemsAccordion.tsx",
        "**/InlineEditor/SectionItemsCards.tsx",
        "**/InlineEditor/SectionItemsGallery.tsx",
        "**/InlineEditor/SectionItemsTwoColumn.tsx",
        // Type-only file — no runtime code to test
        "**/InlineEditor/SectionItemTypes.ts",
        // Pure re-exports from shared package — no logic to test
        "**/shared/domain/categoryConstants.ts",
        "**/shared/presentation/components/AccessDeniedState.tsx",
        "**/shared/application/hooks/useSupabaseAuth.ts",
        "e2e/**",
        "public/**",
        "**/*.spec.ts",
      ],
      cleanOnRerun: false,
      thresholds: {
        branches: 85, functions: 85, lines: 85, statements: 85,
      },
    },
    server: {
      deps: {
        // Force Vite to transform next-intl so its internal "next/navigation" bare
        // specifier resolves correctly (Node ESM requires explicit .js extensions).
        inline: ["next-intl"],
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
