# Implementation Plan: Environment & Secret Management

## Overview

Restructure the candystore monorepo's environment variable and secret management from a single shared `.env` file into per-environment self-contained env files (`.env.dev`, `.env.staging`, `.env.e2e`, `.env.prod`) with a `$secret:KEY_NAME` reference syntax for sensitive values. The updated `load-root-env.js` accepts `TARGET_ENV`, loads the correct env file, resolves secret references from a gitignored `.secrets` file, and maintains backward compatibility with all existing callers.

## Tasks

- [x] 1. Implement secret reference parser and updated env loader
  - [x] 1.1 Add `containsSecretRef`, `resolveSecretRef`, and `parseSecretsFile` functions to `scripts/load-root-env.js`
    - Implement `containsSecretRef(value)` — returns `true` if value contains unescaped `$secret:KEY_NAME` pattern
    - Implement `resolveSecretRef(value, secrets)` — replaces all `$secret:KEY_NAME` with values from secrets map; throws on missing key
    - Implement `parseSecretsFile(filePath)` — parses `.secrets` file into `Record<string, string>` (KEY=VALUE format, `#` comments, blank lines)
    - Handle escape sequence `$$secret:` as literal `$secret:` (not a reference)
    - KEY*NAME grammar: `[A-Z]A-Z0-9*]\*`
    - Export all three functions from the module
    - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4, 3.1_

  - [x] 1.2 Update `loadRootEnv()` in `scripts/load-root-env.js` to support `TARGET_ENV` and secret resolution
    - Accept optional `options` parameter: `{ targetEnv?: string }`
    - Determine target env: `options.targetEnv || process.env.TARGET_ENV || 'dev'`
    - Load `.env.example` as base defaults (only keys not in process.env)
    - Load `.env.{targetEnv}` as overrides (not overwriting CLI/CI-protected keys)
    - When `CI=true`, skip `.secrets` file loading
    - When `CI` is not set, load `.secrets` via `parseSecretsFile` and resolve all `$secret:` references in process.env
    - Throw clear error when `.secrets` is missing but `$secret:` references exist
    - Throw clear error when a referenced secret key is not found in `.secrets`
    - Throw clear error for invalid `TARGET_ENV` (no matching `.env.{targetEnv}` file)
    - Maintain backward compatibility: `loadRootEnv()` with no args defaults to `dev`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 1.3 Write property tests for secret reference parser (fast-check)
    - Install `fast-check` as a root devDependency
    - Create test file `scripts/__tests__/load-root-env.test.js`
    - **Property 1: Env loading precedence** — generate random key-value maps for each layer, verify highest-precedence value wins per key
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 6.2**
    - **Property 2: Secret reference round-trip** — generate random valid KEY*NAMEs (`[A-Z]A-Z0-9*]\*`), verify `parse(construct(key)) === key`
    - **Validates: Requirements 8.5, 2.3, 8.1**
    - **Property 3: Secret resolution completeness** — generate env maps with `$secret:` refs + matching secrets, verify no `$secret:` patterns remain
    - **Validates: Requirements 2.2, 6.4**
    - **Property 4: Escape handling preserves literal dollar-secret** — generate strings with `$$secret:` sequences, verify treated as literals
    - **Validates: Requirements 8.2**

  - [ ]\* 1.4 Write unit tests for env loader
    - `loadRootEnv()` with no args defaults to `dev` (Req 1.6)
    - `loadRootEnv()` with invalid targetEnv throws (Error handling)
    - Missing `.secrets` with `$secret:` refs throws (Req 2.5)
    - Missing secret key in `.secrets` throws with key name (Req 2.4)
    - `CI=true` skips `.secrets` loading (Req 6.3)
    - `containsSecretRef` returns true for `$secret:FOO` (Req 2.1)
    - `containsSecretRef` returns false for `$$secret:FOO` (Req 8.2)
    - `containsSecretRef` returns false for plain strings (Req 2.1)
    - `resolveSecretRef` resolves known key (Req 2.2)
    - `resolveSecretRef` throws for unknown key (Req 2.4)
    - `parseSecretsFile` parses KEY=VALUE format (Req 3.1)
    - `parseSecretsFile` ignores comments and blank lines (Req 3.1)
    - Backward compatibility: `loadRootEnv()` callable with no args (Req 6.5)

- [x] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create per-environment env files and migrate secrets
  - [x] 3.1 Create `.env.dev` with local Supabase configuration and `$secret:` references
    - Self-contained file with all dev-specific values
    - Local Supabase at `http://127.0.0.1:54321`
    - Use `$secret:DEV_SUPABASE_ANON_KEY` and `$secret:DEV_SUPABASE_SERVICE_ROLE_KEY` for secret values
    - Include OAuth provider secret references (`$secret:SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, etc.)
    - Include all auth redirect URLs for local dev
    - _Requirements: 1.1, 1.7, 2.6, 9.1_

  - [x] 3.2 Update `.env.staging` to be self-contained with `$secret:` references
    - Add `$secret:STAGING_SUPABASE_ANON_KEY` and `$secret:STAGING_SUPABASE_SERVICE_ROLE_KEY`
    - Ensure all required variables are present (not just overrides)
    - Include container identity, public origin, app URLs, auth config
    - _Requirements: 1.1, 1.7, 2.6, 9.2_

  - [x] 3.3 Update `.env.e2e` to be self-contained with `$secret:` references
    - Replace inline `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` with `$secret:E2E_SUPABASE_ANON_KEY` and `$secret:E2E_SUPABASE_SERVICE_ROLE_KEY`
    - Ensure all required variables are present
    - Include container identity, Supabase URLs (port 64321), auth config
    - _Requirements: 1.1, 1.7, 2.6, 9.2, 9.3_

  - [x] 3.4 Update `.env.prod` to replace inline secrets with `$secret:` references
    - Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` value with `$secret:PROD_SUPABASE_ANON_KEY`
    - Replace `SUPABASE_SERVICE_ROLE_KEY` value with `$secret:PROD_SUPABASE_SERVICE_ROLE_KEY`
    - Keep all non-secret values (URLs, auth mode, build flags)
    - _Requirements: 1.1, 1.7, 2.6, 9.2, 9.3_

  - [x] 3.5 Update `.env.example` to document `TARGET_ENV` and `$secret:` syntax
    - Add `TARGET_ENV` variable documentation at the top
    - Document the `$secret:KEY_NAME` syntax in comments
    - Replace placeholder secret values with `$secret:` references as documentation
    - Update precedence comment to reflect new loading order
    - _Requirements: 9.5_

  - [x] 3.6 Update `.gitignore` for new file structure
    - Ensure `.secrets` is gitignored (already present)
    - Remove gitignore entries for `.env.e2e`, `.env.prod`, `.env.staging` (these are now committed with `$secret:` refs instead of inline secrets)
    - Keep `.env` gitignored (legacy local overrides)
    - Keep `.env.local*` patterns gitignored
    - _Requirements: 3.3, 9.4_

  - [x] 3.7 Create `.secrets.example` with the new format documenting all expected secret keys
    - List all environment-prefixed secret keys (DEV*, STAGING*, E2E*, PROD*)
    - List shared OAuth secret keys
    - Include comments explaining the format and how to populate via `pnpm sync-secrets`
    - _Requirements: 3.1, 3.4_

- [x] 4. Update script integration for `TARGET_ENV` propagation
  - [x] 4.1 Update `scripts/site-prod.mjs` to set `TARGET_ENV=staging` and use updated `loadRootEnv()`
    - Set `process.env.TARGET_ENV = 'staging'` before calling `loadRootEnv()`
    - Remove any manual `.env.staging` overlay loading (now handled by `loadRootEnv`)
    - _Requirements: 7.2, 7.6_

  - [x] 4.2 Update `scripts/e2e-docker.mjs` to use `loadRootEnv({ targetEnv })` instead of its own `parseEnvFile`
    - Replace the local `parseEnvFile` + manual layering with `loadRootEnv({ targetEnv: envName })`
    - Import `loadRootEnv` via `createRequire` (same pattern as other scripts)
    - Remove the duplicated `parseEnvFile` function
    - Keep the `--env` flag support (pass value as `targetEnv`)
    - _Requirements: 7.3, 7.6_

  - [x] 4.3 Update `scripts/site-up.mjs` to ensure `TARGET_ENV=dev` is set
    - `loadRootEnv()` already defaults to `dev`, so this is a no-op confirmation
    - Verify the script works correctly with the updated loader
    - _Requirements: 7.1, 7.6_

  - [x] 4.4 Update `scripts/grant-user-role.mjs` to accept `TARGET_ENV` for environment selection
    - The script already calls `loadRootEnv()` which defaults to `dev`
    - Verify it resolves correct Supabase credentials for the active target environment
    - _Requirements: 7.5_

- [x] 5. Checkpoint — Ensure all tests pass and scripts load correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create GitHub Actions sync workflow and local sync script
  - [x] 6.1 Create `.github/workflows/sync-secrets.yml`
    - `workflow_dispatch` trigger with `passphrase` input
    - Write all required GitHub secrets to a temporary file in KEY=VALUE format
    - Map GitHub secret names to env-prefixed keys (DEV*, STAGING*, E2E*, PROD*, shared OAuth)
    - Encrypt with `openssl aes-256-cbc -pbkdf2 -pass pass:<passphrase>`
    - Upload encrypted file as artifact with 5-minute retention
    - Delete unencrypted file in a `post` / `always` step
    - Exit non-zero if a required secret is unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Create `scripts/sync-secrets.mjs`
    - Generate random 32-byte hex passphrase
    - Check `gh` CLI is installed and authenticated; error with install instructions if not
    - Trigger `sync-secrets.yml` via `gh workflow run` with passphrase input
    - Poll for workflow completion with 120s timeout
    - Download encrypted artifact via `gh run download`
    - Decrypt with openssl using the passphrase
    - Write result to `.secrets` file at repo root
    - Delete encrypted artifact after decryption
    - Print summary of how many secrets were written
    - Handle timeout and failure with clear error messages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 6.3 Add `sync-secrets` script to `package.json`
    - Add `"sync-secrets": "node scripts/sync-secrets.mjs"` to scripts
    - _Requirements: 5.2_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `load-root-env.js` must remain CommonJS (consumed via `require()` in `next.config.ts`)
- `sync-secrets.mjs` is ESM (consistent with other root scripts)
- The `.env` file (gitignored) is no longer required for normal development workflows after migration
