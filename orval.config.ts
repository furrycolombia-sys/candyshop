import { defineConfig } from "orval";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnv } from "./scripts/load-env.mjs";
loadEnv();

/**
 * OpenAPI specification URL
 * Set ORVAL_OPENAPI_URL in .env.local to use the backend API
 * Falls back to local spec file for offline development
 */
const localSpecPath = "./specs/openapi.yaml";
const openApiTarget = existsSync(resolve(process.cwd(), localSpecPath))
  ? localSpecPath
  : process.env.ORVAL_OPENAPI_URL || localSpecPath;

/**
 * Orval Configuration
 *
 * Generates type-safe React Query hooks from OpenAPI specification.
 *
 * Usage:
 *   pnpm codegen        - Generate all API clients
 *   pnpm codegen:fetch  - Fetch spec + examples only
 *   pnpm codegen:process - Generate from local spec only
 *
 * @see https://orval.dev/reference/configuration/overview
 */
export default defineConfig({
  // Main API configuration
  api: {
    input: {
      // OpenAPI spec location - URL from env or local file fallback
      target: openApiTarget,
      // Validation disabled due to backend OpenAPI spec issues
      // (snake_case paths, missing minItems/maxItems, etc.)
      validation: false,
    },
    output: {
      // Output mode: 'tags-split' creates separate files per API tag
      mode: "tags-split",
      // Where to output generated API hooks (packages/api)
      target: "./packages/api/src/rest/generated",
      // Where to output generated types (packages/api)
      schemas: "./packages/api/src/rest/types/generated",
      // Use React Query as the client
      client: "react-query",
      // Use Axios as HTTP client
      httpClient: "axios",
      // Generate MSW mock handlers — disabled, we don't use mocks
      mock: false,
      // Clean output directory before generating
      clean: true,
      // Generate barrel exports
      indexFiles: true,
      // Base URL handling (empty - no prefix)
      baseUrl: "",
      override: {
        // Use our custom HTTP client that handles auth, case conversion, etc.
        mutator: {
          path: "./packages/api/src/rest/mutator/customFetch.ts",
          name: "customFetch",
        },
        // React Query specific options
        query: {
          useQuery: true,
          useMutation: true,
          // Disabled: API uses page-based pagination, not cursor-based
          useInfinite: false,
          useSuspenseQuery: true,
          useSuspenseInfiniteQuery: false,
          // Generate query key factories
          signal: true,
        },
        // Transform operations
        operations: {
          // Example: customize specific operations
          // getDashboardMetrics: {
          //   query: {
          //     staleTime: 60000,
          //   },
          // },
        },
        // Header handling
        header: (info) => [
          "/**",
          " * AUTO-GENERATED FILE - DO NOT EDIT",
          " *",
          ` * Generated from: ${info.title} v${info.version}`,
          " *",
          " * @see https://orval.dev",
          " */",
          "",
        ],
      },
    },
    hooks: {
      // Run after generation - format generated files
      afterAllFilesWrite:
        'prettier --write "packages/api/src/rest/**/*.{ts,tsx}"',
    },
  },
});
