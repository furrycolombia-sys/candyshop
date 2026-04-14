# Requirements Document

## Introduction

The candystore monorepo currently uses a two-layer env loading strategy (`.env.example` defaults → `.env` overrides) via `load-root-env.js`. The problem is that `.env` contains staging-specific values (e.g. `NEXT_PUBLIC_SUPABASE_URL=https://supabase.ffxivbe.org`) which leak into `pnpm dev`, causing local development to point at the staging Supabase instance instead of the local one.

This feature restructures environment variable loading into a deterministic, environment-aware layering system. Each execution context (dev, staging, e2e, prod) loads the correct env file automatically based on which script is running, eliminating cross-environment contamination.

## Glossary

- **Env_Loader**: The `load-root-env.js` module responsible for parsing `.env` files and populating `process.env` with the correct precedence.
- **Env_Layer**: A single `.env` file that participates in the loading chain. Layers are applied in order; later layers override earlier ones.
- **Base_Defaults**: The `.env.example` file containing safe, committed defaults that work out-of-the-box for local development.
- **Secrets_File**: The `.env` file (gitignored) containing only secret values (API keys, service role keys, OAuth credentials) with no environment-specific URLs.
- **Environment_Overlay**: An environment-specific `.env.<env>` file (e.g. `.env.staging`, `.env.e2e`, `.env.prod`) containing URL overrides and configuration for a particular execution context.
- **Active_Environment**: The environment name resolved by the Env_Loader for the current execution (one of: `dev`, `staging`, `e2e`, `prod`).
- **Script_Runner**: Any root-level script (`site-up.mjs`, `site-prod.mjs`, `e2e-docker.mjs`) or Turbo pipeline entry that invokes the Env_Loader.
- **CLI_Var**: An environment variable set directly on the command line or by CI, which takes highest precedence.
- **Dev_Environment**: The local development context activated by `pnpm dev` or `pnpm dev:up`, targeting local Supabase at `http://127.0.0.1:54321`.
- **Staging_Environment**: The Docker-based staging context activated by `pnpm staging`, targeting the tunneled Supabase at `https://supabase.ffxivbe.org`.
- **E2E_Environment**: The isolated end-to-end testing context activated by `pnpm test:e2e`, targeting the e2e Supabase at `http://localhost:64321`.
- **Prod_Environment**: The production context used for production builds and prod E2E testing, targeting Supabase Cloud.

## Requirements

### Requirement 1: Environment-Aware Layering

**User Story:** As a developer, I want the env loading system to automatically select the correct environment overlay based on which script I run, so that `pnpm dev` always uses local Supabase and `pnpm staging` always uses the staging Supabase without manual file editing.

#### Acceptance Criteria

1. WHEN `pnpm dev` or `pnpm dev:up` is executed, THE Env_Loader SHALL load layers in this order: Base_Defaults → Secrets_File, with no Environment_Overlay applied.
2. WHEN `pnpm staging` is executed, THE Env_Loader SHALL load layers in this order: Base_Defaults → Secrets_File → `.env.staging`.
3. WHEN `pnpm test:e2e` is executed, THE Env_Loader SHALL load layers in this order: Base_Defaults → Secrets_File → `.env.e2e`.
4. WHEN a Script_Runner passes `--env <name>`, THE Env_Loader SHALL load layers in this order: Base_Defaults → Secrets_File → `.env.<name>`.
5. THE Env_Loader SHALL apply layers so that each subsequent layer overrides values from previous layers for the same key.
6. WHEN a CLI_Var is set for a key, THE Env_Loader SHALL preserve the CLI_Var value regardless of any Env_Layer values for that key.

### Requirement 2: Secrets Isolation

**User Story:** As a developer, I want the `.env` file to contain only secrets and personal overrides (no environment-specific URLs), so that it can be shared across all environments without causing cross-contamination.

#### Acceptance Criteria

1. THE Secrets_File SHALL contain only secret credentials (API keys, service role keys, OAuth client IDs and secrets) and developer-specific personal overrides.
2. THE Secrets*File SHALL NOT contain any `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC*\*\_URL`, `SITE_PUBLIC_ORIGIN`, or other environment-specific URL values.
3. WHEN the Secrets_File contains a URL value that is also defined in an Environment_Overlay, THE Env_Loader SHALL use the Environment_Overlay value (overlay wins over secrets for URL keys).
4. IF a developer places an environment-specific URL in the Secrets_File, THEN THE Env_Loader SHALL log a warning identifying the conflicting key and which overlay would override it.

### Requirement 3: Dev Environment Defaults

**User Story:** As a developer, I want `pnpm dev` to work out-of-the-box with local Supabase and localhost URLs, so that I never accidentally connect to staging or production services during development.

#### Acceptance Criteria

1. WHEN no Environment_Overlay is active, THE Env_Loader SHALL resolve `NEXT_PUBLIC_SUPABASE_URL` to `http://127.0.0.1:54321` from Base_Defaults.
2. WHEN no Environment*Overlay is active, THE Env_Loader SHALL resolve all `NEXT_PUBLIC*\*\_URL` app navigation values to their localhost defaults from Base_Defaults.
3. THE Base_Defaults file SHALL contain safe localhost values for all URL variables that work without any additional setup.

### Requirement 4: Env Loader API Update

**User Story:** As a script author, I want the `loadRootEnv` function to accept an optional environment name parameter, so that each script can declaratively specify which environment it targets.

#### Acceptance Criteria

1. THE Env_Loader SHALL export a `loadRootEnv` function that accepts an optional `envName` string parameter.
2. WHEN `loadRootEnv` is called without an `envName` parameter, THE Env_Loader SHALL load only Base_Defaults and Secrets_File (dev mode).
3. WHEN `loadRootEnv` is called with an `envName` parameter, THE Env_Loader SHALL additionally load the corresponding `.env.<envName>` file as the Environment_Overlay.
4. IF `loadRootEnv` is called with an `envName` that has no corresponding `.env.<envName>` file, THEN THE Env_Loader SHALL throw an error with a message identifying the missing file path.

### Requirement 5: Script Integration

**User Story:** As a developer, I want each monorepo script to automatically pass the correct environment name to the Env_Loader, so that I do not need to remember which env file goes with which command.

#### Acceptance Criteria

1. WHEN `site-up.mjs` calls the Env_Loader, THE Script_Runner SHALL call `loadRootEnv()` with no environment name (Dev_Environment).
2. WHEN `site-prod.mjs` calls the Env_Loader, THE Script_Runner SHALL call `loadRootEnv("staging")`.
3. WHEN `e2e-docker.mjs` calls the Env_Loader, THE Script_Runner SHALL call `loadRootEnv` with the value of the `--env` flag (defaulting to `"e2e"`).
4. WHEN a Next.js app's `next.config.ts` calls the Env_Loader, THE Script_Runner SHALL call `loadRootEnv()` with no environment name (Dev_Environment), since Turbo dev is always local.

### Requirement 6: Backward Compatibility

**User Story:** As a developer, I want the migration to preserve existing behavior for staging, e2e, and prod scripts, so that nothing breaks during the transition.

#### Acceptance Criteria

1. AFTER migration, WHEN `pnpm staging` is executed, THE Env_Loader SHALL produce the same resolved environment variables as the current system (`.env.example` + `.env` + `.env.staging` values).
2. AFTER migration, WHEN `pnpm test:e2e` is executed, THE Env_Loader SHALL produce the same resolved environment variables as the current `e2e-docker.mjs` layering (`.env` + `.env.e2e` values).
3. THE Env_Loader SHALL continue to support the existing `canSet` guard that prevents overwriting CLI_Vars.
4. THE Env_Loader SHALL remain a CommonJS module (`module.exports`) so that existing `require()` calls in `next.config.ts` files continue to work.

### Requirement 7: Migration of Existing .env File

**User Story:** As a developer, I want clear guidance on how to migrate my existing `.env` file so that secrets stay in `.env` and environment-specific URLs move to the correct overlay files.

#### Acceptance Criteria

1. THE migration SHALL provide a script or documented procedure that identifies URL values in the existing Secrets_File that belong in an Environment_Overlay.
2. WHEN the migration procedure is executed, THE migration SHALL move environment-specific URL values from the Secrets_File to the appropriate Environment_Overlay without data loss.
3. AFTER migration, THE Secrets_File SHALL contain only secret credentials and personal overrides.
4. THE migration SHALL NOT modify any committed files (Base_Defaults, `.env.e2e.example`, `.env.local.e2e.example`).

### Requirement 8: Env File Validation

**User Story:** As a developer, I want the env loader to validate that required variables are present after all layers are applied, so that I get a clear error instead of a cryptic runtime failure.

#### Acceptance Criteria

1. AFTER all Env_Layers are loaded, THE Env_Loader SHALL verify that `NEXT_PUBLIC_SUPABASE_URL` is defined and non-empty.
2. AFTER all Env_Layers are loaded, THE Env_Loader SHALL verify that `NEXT_PUBLIC_SUPABASE_ANON_KEY` is defined and not equal to the placeholder value `YOUR_SUPABASE_ANON_KEY`.
3. IF a required variable is missing or contains a placeholder value, THEN THE Env_Loader SHALL throw an error listing all missing or placeholder variables.
4. WHEN the Active_Environment is `dev`, THE Env_Loader SHALL verify that `NEXT_PUBLIC_SUPABASE_URL` points to a localhost address (`127.0.0.1` or `localhost`), and log a warning if it does not.
