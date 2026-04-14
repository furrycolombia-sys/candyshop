# Analysis: GH-2

## Branch Context

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| **Branch**    | `feat/GH-2_Supabase-Setup-Core-Schema` |
| **Type**      | feat                                   |
| **Source**    | `develop`                              |
| **PR Target** | `develop`                              |

## Task Summary

Set up Supabase project, create the full database schema (events, products, orders, check-ins, permissions, transfers), configure the client in the monorepo, and seed Moonfest 2026 data.

## Relevant Files

| File                                      | Purpose               | Action                                         |
| ----------------------------------------- | --------------------- | ---------------------------------------------- |
| `packages/api/src/index.ts`               | Main API exports      | Modify — add Supabase exports                  |
| `packages/api/src/rest/mutator/config.ts` | Env config pattern    | Reference — follow same pattern                |
| `packages/api/package.json`               | API dependencies      | Modify — add @supabase/supabase-js             |
| `packages/auth/src/domain/types.ts`       | Auth types (roles)    | Reference — will need updating for permissions |
| `.env.example`                            | Environment variables | Modify — add Supabase vars                     |
| `apps/store/next.config.ts`               | Transpile config      | Reference — already transpiles `api`           |

## Existing Patterns

### API Client Pattern

- **Location**: `packages/api/src/rest/mutator/customFetch.ts`
- **Description**: Axios-based client with token injection via `setAccessTokenGetter()`, retry on 401, response unwrapping
- **Relevance**: Supabase client should follow the same pattern — live alongside REST/GraphQL in `packages/api/src/supabase/`

### Auth Token Pattern

- **Location**: `packages/auth/src/client/accessToken.ts`
- **Description**: Cookie-based tokens (`auth_access_token`), in-memory getter/setter, refresh logic
- **Relevance**: Supabase session will replace this — Supabase manages its own JWT tokens

### Auth Provider Mode

- **Location**: `.env.example` — `AUTH_PROVIDER_MODE=mock|backend|keycloak`
- **Description**: Pluggable auth modes — app behavior changes based on env var
- **Relevance**: Add `supabase` as a new mode

### Environment Config Pattern

- **Location**: `packages/api/src/rest/mutator/config.ts`
- **Description**: Reads `NEXT_PUBLIC_*` env vars, exports typed config
- **Relevance**: Follow same pattern for Supabase URL + anon key

## Architecture Decision

**Supabase client lives in `packages/api/src/supabase/`** — mirrors the REST/GraphQL structure:

```
packages/api/src/
├── rest/           (existing)
├── graphql/        (existing)
└── supabase/       (NEW)
    ├── client.ts           # createClient, singleton
    ├── config.ts           # Env vars (URL, anon key)
    ├── types.ts            # Database types (generated)
    └── migrations/         # SQL migration files
```

**Why here and not a new package:**

- Centralizes all data layer code
- Reuses existing transpilation setup (apps already transpile `api`)
- Consistent import pattern: `import { supabase } from "api"`
- Follows existing REST/GraphQL organizational pattern

## Files to Create

| File                                      | Description                                  |
| ----------------------------------------- | -------------------------------------------- |
| `packages/api/src/supabase/client.ts`     | Supabase client singleton (browser + server) |
| `packages/api/src/supabase/config.ts`     | Environment variable config                  |
| `packages/api/src/supabase/types.ts`      | Generated database types                     |
| `supabase/migrations/001_core_schema.sql` | Full schema migration                        |
| `supabase/seed.sql`                       | Moonfest 2026 seed data                      |
| `supabase/config.toml`                    | Supabase CLI local config                    |

## Files to Modify

| File                        | Change                                                          |
| --------------------------- | --------------------------------------------------------------- |
| `packages/api/src/index.ts` | Add Supabase client export                                      |
| `packages/api/package.json` | Add `@supabase/supabase-js` dependency                          |
| `.env.example`              | Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `root package.json`         | Add `supabase` CLI as devDependency                             |

## Key Insights

1. **No breaking changes** — existing REST/GraphQL clients untouched
2. **Source-to-source** — Supabase client in `packages/api` is immediately available to all apps via `transpilePackages`
3. **Auth provider mode** — existing `AUTH_PROVIDER_MODE` pattern lets us add `supabase` mode without touching other auth flows
4. **Supabase CLI for local dev** — `supabase start` gives local Postgres + Auth + Studio, matching cloud behavior
5. **Migration-based schema** — SQL files in `supabase/migrations/` for reproducible setup

## Questions/Blockers

- [ ] User needs to create Supabase project at supabase.com (or we use local-only for now with `supabase start`)
- [ ] Decide: Supabase Cloud vs local-first development? (recommend local-first with CLI, deploy to cloud later)
