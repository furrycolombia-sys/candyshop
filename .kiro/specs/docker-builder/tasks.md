# Tasks — docker-builder

## Task List

- [x] 1. Patch `docker/smoke/Dockerfile` — add missing ARG/ENV declarations
  - [x] 1.1 Add `ARG NEXT_PUBLIC_AUTH_HOST_URL` and `ENV NEXT_PUBLIC_AUTH_HOST_URL=$NEXT_PUBLIC_AUTH_HOST_URL` in the build-args block
  - [x] 1.2 Add `ARG APP_PUBLIC_ORIGIN` and `ENV APP_PUBLIC_ORIGIN=$APP_PUBLIC_ORIGIN` in the build-args block
  - [x] 1.3 Add `ARG NEXT_PUBLIC_ENABLE_TEST_IDS` and `ENV NEXT_PUBLIC_ENABLE_TEST_IDS=$NEXT_PUBLIC_ENABLE_TEST_IDS` in the build-args block

- [x] 2. Create `docker/compose.yml`
  - [x] 2.1 Define a single `app` service using `${SITE_PROD_IMAGE_NAME}` as the image and `${SITE_PROD_CONTAINER_NAME}` as the container name
  - [x] 2.2 Map host port via `${HOST_PORT:-8088}:80` so the port is resolved at runtime from the env
  - [x] 2.3 Set `restart: unless-stopped`

- [x] 3. Create `scripts/docker-build.mjs`
  - [x] 3.1 Parse CLI args: `--env <name>` (default `"prod"`), `--no-cache`, `--up`, `--help`
  - [x] 3.2 Print usage summary and exit 0 when `--help` is passed
  - [x] 3.3 Call `loadEnv(targetEnv)` wrapped in try/catch; on error print to stderr and exit 1
  - [x] 3.4 Read `SITE_PROD_IMAGE_NAME` and `SITE_PROD_CONTAINER_NAME` from `process.env`; exit 1 with descriptive error if either is missing
  - [x] 3.5 Parse `HOST_PORT` from `APP_PUBLIC_ORIGIN` using `new URL()`; default to `8088` if no port or parse fails; set `process.env.HOST_PORT`
  - [x] 3.6 Collect all 13 build-arg keys from `process.env` and build the `--build-arg KEY=VALUE` array
  - [x] 3.7 Print resolved `targetEnv` and `imageName` to stdout before any Docker command
  - [x] 3.8 Invoke `docker build` via `spawnSync` with `stdio: "inherit"`, `-f docker/smoke/Dockerfile`, `-t <imageName>`, all `--build-arg` flags, optional `--no-cache`, and `.` as build context
  - [x] 3.9 On non-zero exit from `docker build`, print error to stderr and exit with the same code
  - [x] 3.10 Print success message containing `imageName` on successful build
  - [x] 3.11 When `--up` is set and build succeeded, invoke `docker compose -f docker/compose.yml --env-file .env.<targetEnv> up -d` via `spawnSync` with `stdio: "inherit"`
  - [x] 3.12 On non-zero exit from `docker compose up`, print error to stderr and exit with the same code
  - [x] 3.13 Print confirmation message when compose up succeeds
  - [x] 3.14 Exit with code 0 on full success

- [x] 4. Add `docker:build` script to `package.json`
  - [x] 4.1 Add `"docker:build": "node scripts/docker-build.mjs"` to the `scripts` object in `package.json`

- [x] 5. Write unit and property-based tests for `scripts/docker-build.mjs`
  - [x] 5.1 Set up test file with mocks for `spawnSync` and `loadEnv`
  - [x] 5.2 Example test: `--env staging` causes `loadEnv("staging")` to be called
  - [x] 5.3 Example test: no `--env` flag causes `loadEnv("prod")` to be called
  - [x] 5.4 Example test: `--no-cache` appends `--no-cache` to docker build args
  - [x] 5.5 Example test: no `--no-cache` means `--no-cache` is absent from docker build args
  - [x] 5.6 Example test: `--up` triggers docker compose command after successful build
  - [x] 5.7 Example test: no `--up` means docker compose is never called
  - [x] 5.8 Edge case test: `loadEnv` throws → stderr message + exit 1
  - [x] 5.9 Edge case test: `docker build` exits non-zero → stderr message + same exit code, compose not called
  - [x] 5.10 Edge case test: `docker compose up` exits non-zero → stderr message + same exit code
  - [x] 5.11 PBT — Property 1: for any `SITE_PROD_IMAGE_NAME` string, `-t` arg equals that value (≥100 iterations) — `Feature: docker-builder, Property 1: image name is always sourced from env`
  - [x] 5.12 PBT — Property 2: for any values of the 13 build-arg keys, all appear as `--build-arg KEY=VALUE` flags (≥100 iterations) — `Feature: docker-builder, Property 2: all build args are sourced from env`
  - [x] 5.13 PBT — Property 3: for any non-zero exit code from `docker build`, compose is never invoked (≥100 iterations) — `Feature: docker-builder, Property 3: compose is never called after a failed build`
  - [x] 5.14 PBT — Property 4: for any `SITE_PROD_IMAGE_NAME` string, success message contains that name (≥100 iterations) — `Feature: docker-builder, Property 4: success message always contains the image name`
