import type { CodegenConfig } from "@graphql-codegen/cli";

// Load root .env.example (defaults) and .env (overrides) before reading config
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadRootEnv } = require("./scripts/load-root-env.js");
loadRootEnv();

/**
 * GraphQL Code Generator Configuration
 *
 * Generates typed React Query hooks from the Strawberry GraphQL schema.
 * Runs alongside the existing Orval REST codegen without conflicts.
 *
 * Usage:
 *   pnpm codegen:graphql          - Fetch schema from endpoint and generate hooks
 *   pnpm codegen:graphql:watch    - Watch mode (re-generates on .graphql file changes)
 *
 * Schema source is read from GRAPHQL_ENDPOINT_URL in .env.development or .env.local
 *
 * @see https://the-guild.dev/graphql/codegen/docs/config-reference/codegen-config
 */
const config: CodegenConfig = {
  // Introspect schema directly from the GraphQL endpoint (set in .env files)
  schema: process.env.GRAPHQL_ENDPOINT_URL,

  // Scan operation documents (queries, mutations, fragments)
  documents: "./packages/api/src/graphql/operations/**/*.graphql",

  // Generate output
  generates: {
    // Single output file with all types, operations, and hooks
    "./packages/api/src/graphql/generated/index.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-query",
      ],
      config: {
        // Custom fetcher: matches the signature (query, variables, options) => () => Promise<TData>
        fetcher: {
          func: "../mutator/graphqlFetch#graphqlFetch",
          isReactHook: false,
        },

        // React Query v5 settings
        reactQueryVersion: 5,
        addSuspenseQuery: true,
        exposeQueryKeys: true,
        exposeFetcher: true,
        exposeDocument: true,

        // TypeScript settings
        enumsAsTypes: true,
        skipTypename: true,
        scalars: {
          JSON: "Record<string, unknown>",
        },

        // Code style
        dedupeFragments: true,
        pureMagicComment: true,
      },
    },
  },

  // Suppress unnecessary console output
  silent: false,
};

export default config;
