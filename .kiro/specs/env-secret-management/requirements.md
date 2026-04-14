# Requirements Document

## Introduction

The candystore monorepo currently relies on a single `.env` file (gitignored) that holds all configuration — URLs, keys, secrets — for whichever environment was last configured. Switching between dev, staging, e2e, and production requires manually editing `.env` or polluting shell environment variables, which leaks across environments and causes misconfiguration.

This feature restructures environment variable and secret management so that:

- Each environment has its own self-contained env file with all non-secret configuration.
- Secrets are referenced by name (`$secret:KEY_NAME`) rather than stored in env files.
- GitHub repository secrets serve as the single source of truth for secret values.
- A local sync script fetches secrets from GitHub into a gitignored `.secrets` file.
- The env loader resolves secret references at runtime, failing clearly when secrets are missing.
- All existing scripts (`pnpm dev`, `pnpm staging`, `pnpm test:e2e`, production builds) work without manual `.env` editing.

## Glossary

- **Env_Loader**: The `scripts/load-root-env.js` module responsible for reading environment files, resolving secret references, and populating `process.env`.
- **Env_File**: An environment-specific file (e.g., `.env.dev`, `.env.staging`, `.env.e2e`, `.env.prod`) containing all non-secret configuration for a single target environment.
- **Secret_Reference**: A placeholder string in the format `$secret:KEY_NAME` inside an Env_File that the Env_Loader resolves to an actual secret value at runtime.
- **Secrets_File**: The local `.secrets` file (gitignored) containing key-value pairs of resolved secret values, populated by the Sync_Script.
- **Sync_Script**: A local CLI script (`scripts/sync-secrets.mjs`) that triggers a GitHub Actions workflow, downloads the encrypted secrets artifact, decrypts it, and writes the Secrets_File.
- **Secrets_Workflow**: A GitHub Actions workflow (`sync-secrets.yml`) that reads requested GitHub repository secrets and produces an encrypted artifact for download.
- **Target_Environment**: One of `dev`, `staging`, `e2e`, or `prod` — the environment a developer intends to run against.
- **GitHub_CLI**: The `gh` command-line tool used by the Sync_Script to trigger workflows and download artifacts.

## Requirements

### Requirement 1: Environment-Specific Env Files

**User Story:** As a developer, I want each environment to have its own self-contained env file, so that I can switch between dev, staging, e2e, and production without manually editing a shared `.env` file.

#### Acceptance Criteria

1. THE Env_Loader SHALL support the following Env_Files: `.env.dev`, `.env.staging`, `.env.e2e`, and `.env.prod`.
2. WHEN a Target_Environment is specified, THE Env_Loader SHALL load the corresponding Env_File as the primary source of non-secret configuration.
3. THE Env_Loader SHALL load `.env.example` as the base defaults layer before loading the Target_Environment Env_File.
4. WHEN a variable is defined in both `.env.example` and the Target_Environment Env_File, THE Env_Loader SHALL use the value from the Target_Environment Env_File.
5. WHEN a variable is already set in `process.env` (from CLI or CI), THE Env_Loader SHALL preserve the existing `process.env` value over any file-based value.
6. WHEN no Target_Environment is specified, THE Env_Loader SHALL default to the `dev` Target_Environment.
7. THE Env_File for each Target_Environment SHALL contain all non-secret configuration required to run that environment (URLs, feature flags, container identity, build flags).

### Requirement 2: Secret Reference Syntax

**User Story:** As a developer, I want env files to reference secrets by name instead of containing actual secret values, so that secrets are never committed to version control.

#### Acceptance Criteria

1. THE Env_Loader SHALL recognize values matching the pattern `$secret:KEY_NAME` as Secret_References.
2. WHEN the Env_Loader encounters a Secret_Reference, THE Env_Loader SHALL replace the reference with the corresponding value from the Secrets_File.
3. THE Secret*Reference syntax SHALL support alphanumeric characters and underscores in the KEY_NAME portion (matching the pattern `[A-Z0-9*]+`).
4. WHEN a Secret_Reference KEY_NAME is not found in the Secrets_File, THE Env_Loader SHALL terminate with an error message that identifies the missing secret and instructs the developer to run the Sync_Script.
5. WHEN the Secrets_File does not exist and the loaded Env_File contains Secret_References, THE Env_Loader SHALL terminate with an error message instructing the developer to run the Sync_Script.
6. THE Env_Files committed to version control SHALL use Secret_References for all sensitive values (API keys, service role keys, OAuth client secrets, database credentials).

### Requirement 3: Secrets File Format and Storage

**User Story:** As a developer, I want a local `.secrets` file that holds resolved secret values, so that the Env_Loader can resolve Secret_References without network access during normal development.

#### Acceptance Criteria

1. THE Secrets_File SHALL use the standard `KEY=VALUE` format (one secret per line, `#` for comments).
2. THE Secrets_File SHALL be located at the repository root as `.secrets`.
3. THE Secrets_File SHALL be listed in `.gitignore` to prevent accidental commits.
4. THE Secrets_File SHALL contain secrets for all Target_Environments in a single file, using environment-prefixed key names (e.g., `DEV_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`).
5. WHEN the Secrets_File already exists, THE Sync_Script SHALL overwrite the Secrets_File with the latest values from GitHub.

### Requirement 4: GitHub Actions Secrets Sync Workflow

**User Story:** As a developer, I want a GitHub Actions workflow that packages repository secrets into an encrypted artifact, so that I can securely download secrets to my local machine.

#### Acceptance Criteria

1. THE Secrets_Workflow SHALL be triggered via `workflow_dispatch` by the Sync_Script using the GitHub_CLI.
2. THE Secrets_Workflow SHALL read all required GitHub repository secrets and write them to a single file.
3. THE Secrets_Workflow SHALL encrypt the secrets file using a one-time passphrase provided as a workflow input.
4. THE Secrets_Workflow SHALL upload the encrypted file as a GitHub Actions artifact with a retention period of 5 minutes.
5. IF the Secrets_Workflow fails to read a required secret, THEN THE Secrets_Workflow SHALL exit with a non-zero status and log which secret is unavailable.
6. THE Secrets_Workflow SHALL delete the unencrypted secrets file from the runner before the job completes.

### Requirement 5: Local Secrets Sync Script

**User Story:** As a developer, I want a local CLI script that fetches secrets from GitHub and writes them to my `.secrets` file, so that I can set up or refresh secrets with a single command.

#### Acceptance Criteria

1. THE Sync_Script SHALL generate a random one-time passphrase for each sync operation.
2. THE Sync_Script SHALL trigger the Secrets_Workflow via the GitHub_CLI, passing the passphrase as a workflow input.
3. THE Sync_Script SHALL poll for the workflow run to complete, with a timeout of 120 seconds.
4. WHEN the Secrets_Workflow completes successfully, THE Sync_Script SHALL download the encrypted artifact using the GitHub_CLI.
5. THE Sync_Script SHALL decrypt the artifact using the one-time passphrase and write the result to the Secrets_File.
6. THE Sync_Script SHALL delete the downloaded encrypted artifact after decryption.
7. IF the GitHub_CLI is not installed or not authenticated, THEN THE Sync_Script SHALL terminate with an error message explaining the prerequisite.
8. IF the Secrets_Workflow times out or fails, THEN THE Sync_Script SHALL terminate with an error message and a non-zero exit code.
9. WHEN invoked, THE Sync_Script SHALL print a summary of how many secrets were written to the Secrets_File.

### Requirement 6: Updated Env Loader with Secret Resolution

**User Story:** As a developer, I want the env loader to automatically resolve secret references from the `.secrets` file, so that all scripts and apps receive fully resolved environment variables without extra steps.

#### Acceptance Criteria

1. THE Env_Loader SHALL accept a `TARGET_ENV` parameter (via `process.env.TARGET_ENV` or function argument) to determine which Env_File to load.
2. THE Env_Loader SHALL load files in this precedence order (highest wins): `process.env` (CLI/CI) > Secrets_File resolution > Target_Environment Env_File > `.env.example` (defaults).
3. WHEN running in a CI environment (detected by the `CI` environment variable being set to `true`), THE Env_Loader SHALL skip Secrets_File loading and rely on `process.env` values injected by the CI platform.
4. THE Env_Loader SHALL resolve all Secret_References after loading the Target_Environment Env_File and before returning control to the caller.
5. THE Env_Loader SHALL export a `loadRootEnv` function that maintains backward compatibility with existing callers in `next.config.ts` files and root scripts.

### Requirement 7: Script Integration

**User Story:** As a developer, I want all existing monorepo scripts to use the correct environment configuration automatically, so that `pnpm dev`, `pnpm staging`, `pnpm test:e2e`, and production builds work without manual `.env` editing.

#### Acceptance Criteria

1. WHEN `pnpm dev` is executed, THE Env_Loader SHALL load the `dev` Target_Environment configuration.
2. WHEN `pnpm staging` is executed, THE Env_Loader SHALL load the `staging` Target_Environment configuration.
3. WHEN `pnpm test:e2e` is executed, THE Env_Loader SHALL load the `e2e` Target_Environment configuration.
4. WHEN a production build is executed in CI, THE Env_Loader SHALL load the `prod` Target_Environment configuration with secrets provided via `process.env`.
5. WHEN `scripts/grant-user-role.mjs` is executed, THE Env_Loader SHALL resolve the correct Supabase credentials for the active Target_Environment.
6. THE script integration SHALL set `TARGET_ENV` before invoking Turbo or app-level scripts, so that downstream `next.config.ts` files receive the correct environment.

### Requirement 8: Secret Reference Parser and Printer

**User Story:** As a developer, I want the secret reference parsing logic to be correct and invertible, so that env files can be reliably read and regenerated.

#### Acceptance Criteria

1. THE Env*Loader SHALL parse Secret_References using the grammar: `$secret:` followed by one or more characters matching `[A-Z0-9*]`.
2. THE Env_Loader SHALL distinguish between a literal string `$secret:` (when escaped as `$$secret:`) and an actual Secret_Reference.
3. THE Env_Loader SHALL provide a `resolveSecretRef` function that takes a value string and a secrets map, and returns the resolved value.
4. THE Env_Loader SHALL provide a `containsSecretRef` function that takes a value string and returns a boolean indicating whether the value contains a Secret_Reference.
5. FOR ALL valid Secret_References, parsing the reference to extract the KEY_NAME and then reconstructing the reference as `$secret:KEY_NAME` SHALL produce the original reference string (round-trip property).

### Requirement 9: Migration from Current Setup

**User Story:** As a developer, I want a clear migration path from the current single `.env` setup to the new environment-specific files, so that the transition does not break existing workflows.

#### Acceptance Criteria

1. THE migration SHALL create `.env.dev` from the current `.env.example` defaults combined with local development Supabase values.
2. THE migration SHALL update `.env.staging`, `.env.e2e`, and `.env.prod` to be self-contained files that include all required variables (not just overrides).
3. THE migration SHALL replace inline secret values in `.env.e2e` and `.env.prod` with Secret_References.
4. THE migration SHALL update `.gitignore` to reflect the new file structure (gitignore `.secrets`, keep committed Env_Files as appropriate).
5. THE migration SHALL update `.env.example` to document the new Secret_Reference syntax and the `TARGET_ENV` variable.
6. WHEN the migration is complete, THE existing `.env` file SHALL no longer be required for normal development workflows.
