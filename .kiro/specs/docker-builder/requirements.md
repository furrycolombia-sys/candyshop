# Requirements Document

## Introduction

`scripts/docker-build.mjs` is a Node.js script that builds the production Docker image for any named environment and optionally starts the container via `docker compose up -d`. It replaces the manual Docker commands documented in `docs/infrastructure.md` and supersedes the environment-specific logic in `scripts/docker-health-check.sh`.

The script has a single source of truth for all configuration: `loadEnv(targetEnv)` from `scripts/load-env.mjs`. Every value passed to Docker — image name, container name, build args — is read from the resolved env file. No value is hardcoded in the script itself.

It is invoked as `pnpm docker:build --env <name>` and is suitable for local development, CI pipelines, and server-side deploy scripts.

---

## Glossary

- **Script**: `scripts/docker-build.mjs` — the Node.js ESM script being specified.
- **Env_Loader**: `scripts/load-env.mjs` — the existing module that parses `.env.<name>` and resolves `$secret:` references into `process.env`.
- **Target_Env**: The environment name passed via `--env <name>` (e.g. `dev`, `test`, `staging`, `prod`). Defaults to `prod` when omitted.
- **Env_File**: The file `.env.<Target_Env>` loaded by the Env_Loader.
- **Build_Args**: The set of `--build-arg KEY=VALUE` flags forwarded to `docker build`, derived exclusively from `process.env` after the Env_Loader runs.
- **Image_Name**: The value of `SITE_PROD_IMAGE_NAME` from the resolved env.
- **Container_Name**: The value of `SITE_PROD_CONTAINER_NAME` from the resolved env.
- **Compose_File**: `docker/compose.yml` — the Docker Compose file used when `--up` is passed.
- **`--up` flag**: Optional CLI flag that, when present, causes the Script to run `docker compose up -d` after a successful build.
- **`--no-cache` flag**: Optional CLI flag that, when present, passes `--no-cache` to `docker build`.

---

## Requirements

### Requirement 1: Environment Loading

**User Story:** As a developer, I want the script to load all configuration from the env file for the specified environment, so that no values are hardcoded and any environment can be targeted without modifying the script.

#### Acceptance Criteria

1. WHEN the Script is invoked with `--env <name>`, THE Script SHALL call `loadEnv(name)` before executing any Docker command.
2. WHEN the Script is invoked without `--env`, THE Script SHALL call `loadEnv("prod")` as the default.
3. WHEN `loadEnv` throws because the env file does not exist, THE Script SHALL print the error message to stderr and exit with a non-zero code.
4. WHEN `loadEnv` throws because a `$secret:` reference cannot be resolved, THE Script SHALL print the error message to stderr and exit with a non-zero code.
5. THE Script SHALL derive Image_Name exclusively from `process.env.SITE_PROD_IMAGE_NAME` after the Env_Loader has run.
6. THE Script SHALL derive Container_Name exclusively from `process.env.SITE_PROD_CONTAINER_NAME` after the Env_Loader has run.

---

### Requirement 2: Docker Build Execution

**User Story:** As a developer, I want the script to build the Docker image with all required build args sourced from the loaded env, so that the image is correctly configured for the target environment without any hardcoded values.

#### Acceptance Criteria

1. WHEN the Script executes the build, THE Script SHALL invoke `docker build` with `-t <Image_Name>` derived from `process.env.SITE_PROD_IMAGE_NAME`.
2. THE Script SHALL pass each of the following as a `--build-arg` to `docker build`, reading the value from `process.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_AUTH_URL`
   - `NEXT_PUBLIC_AUTH_HOST_URL`
   - `NEXT_PUBLIC_STORE_URL`
   - `NEXT_PUBLIC_ADMIN_URL`
   - `NEXT_PUBLIC_PLAYGROUND_URL`
   - `NEXT_PUBLIC_LANDING_URL`
   - `NEXT_PUBLIC_PAYMENTS_URL`
   - `NEXT_PUBLIC_STUDIO_URL`
   - `NEXT_PUBLIC_BUILD_HASH`
   - `NEXT_PUBLIC_ENABLE_TEST_IDS`
   - `APP_PUBLIC_ORIGIN`
3. THE Script SHALL use `-f docker/smoke/Dockerfile` as the Dockerfile path.
4. THE Script SHALL set the build context to the repository root (`.`).
5. THE Script SHALL NOT contain any hardcoded string values for image names, container names, URLs, keys, or build arg values.
6. WHEN `docker build` exits with a non-zero code, THE Script SHALL print a descriptive error to stderr and exit with the same non-zero code.

---

### Requirement 3: No-Cache Flag

**User Story:** As a developer or CI pipeline, I want to force a clean build without Docker layer cache, so that I can guarantee a fresh image when needed.

#### Acceptance Criteria

1. WHEN the Script is invoked with `--no-cache`, THE Script SHALL append `--no-cache` to the `docker build` command.
2. WHEN the Script is invoked without `--no-cache`, THE Script SHALL NOT pass `--no-cache` to `docker build`.

---

### Requirement 4: Optional Compose Up

**User Story:** As a developer, I want to optionally start the container after building, so that I can go from zero to a running environment with a single command.

#### Acceptance Criteria

1. WHEN the Script is invoked with `--up`, THE Script SHALL run `docker compose -f docker/compose.yml up -d` after a successful build.
2. WHEN the Script is invoked without `--up`, THE Script SHALL NOT run any `docker compose` command.
3. WHEN `docker compose up -d` exits with a non-zero code, THE Script SHALL print a descriptive error to stderr and exit with the same non-zero code.
4. WHEN `docker compose up -d` succeeds, THE Script SHALL print a confirmation message indicating the container is running.
5. THE Script SHALL NOT run `docker compose up -d` if the preceding `docker build` step failed.

---

### Requirement 5: CLI Interface and Package Script

**User Story:** As a developer, I want a consistent, discoverable CLI interface and a `pnpm` shortcut, so that the script is easy to invoke from any context.

#### Acceptance Criteria

1. THE Script SHALL accept `--env <name>` as the environment selector, where `<name>` is any string matching an existing `.env.<name>` file.
2. THE Script SHALL accept `--no-cache` as an optional boolean flag.
3. THE Script SHALL accept `--up` as an optional boolean flag.
4. THE Script SHALL print a usage summary to stdout when invoked with `--help`.
5. THE `package.json` root scripts object SHALL contain a `docker:build` entry defined as `node scripts/docker-build.mjs`.
6. WHEN invoked as `pnpm docker:build --env prod --no-cache --up`, THE Script SHALL load `.env.prod`, build the image without cache, and start the container.

---

### Requirement 6: Progress Output

**User Story:** As a developer running the script interactively or in CI, I want clear progress messages, so that I can follow what the script is doing and diagnose failures quickly.

#### Acceptance Criteria

1. WHEN the Script starts, THE Script SHALL print the resolved Target_Env and Image_Name to stdout before executing any Docker command.
2. WHEN `docker build` starts, THE Script SHALL stream Docker's stdout and stderr directly to the terminal in real time.
3. WHEN `docker build` succeeds, THE Script SHALL print a success message including the Image_Name.
4. WHEN `--up` is passed and `docker compose up -d` starts, THE Script SHALL print a message indicating the compose step is starting.
5. WHEN the Script exits successfully, THE Script SHALL exit with code `0`.
