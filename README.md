# Candy Shop

A multi-seller store and payment platform for selling products, services, tickets, promos, and coupons. Built as a pnpm workspace monorepo with 7 Next.js apps sharing common packages.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Staging](#staging)
- [Cloud Develop Environment](#cloud-develop-environment)
- [E2E Testing](#e2e-testing)
- [Supabase](#supabase)
- [Secrets](#secrets)
- [Code Quality](#code-quality)
- [Architecture](#architecture)
- [Environment Files](#environment-files)
- [Machine Recovery](#machine-recovery)

---

## Prerequisites

- **Node.js** 22+
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker Desktop** (for staging and e2e)
- **Supabase CLI** (`pnpm supabase --version`)

---

## Quick Start

```bash
pnpm install
pnpm supabase:start   # start local Supabase (port 54321)
pnpm dev              # start all apps in dev mode
```

Apps will be available at:

| App        | URL                              |
| ---------- | -------------------------------- |
| Landing    | http://localhost:5004            |
| Store      | http://localhost:5001/store      |
| Payments   | http://localhost:5005/payments   |
| Admin      | http://localhost:5002/admin      |
| Studio     | http://localhost:5006/studio     |
| Auth       | http://localhost:5000/auth       |
| Playground | http://localhost:5003/playground |

---

## Development

### Start everything

```bash
pnpm dev              # all apps + hot reload
```

### Start individual apps

```bash
pnpm dev:store        # store only       → http://localhost:5001
pnpm dev:landing      # landing only     → http://localhost:5004
pnpm dev:payments     # payments only    → http://localhost:5005
pnpm dev:admin        # admin only       → http://localhost:5002
pnpm dev:auth         # auth only        → http://localhost:5000
pnpm dev:studio       # studio only      → http://localhost:5006
```

### Expose dev to the internet (Cloudflare tunnel)

```bash
pnpm dev:up:tunnel    # dev stack + Cloudflare tunnel
```

### Build

```bash
pnpm build            # build all apps
pnpm typecheck        # TypeScript check only
```

---

## Staging

Staging runs the full production Docker image (all 7 apps behind nginx) on port **8088**, with a full Supabase stack containerized alongside it.

### Local staging (no public URL)

```bash
pnpm staging          # build + start → http://localhost:8088
pnpm staging:stop     # stop
pnpm staging:fresh    # force rebuild from scratch (no cache)
```

### Staging with Cloudflare tunnel (public URL)

```bash
pnpm staging:tunnel   # build + start + tunnel → https://store.ffxivbe.org
```

### Staging via PowerShell (Windows)

```powershell
pnpm staging:public         # build + start + tunnel
pnpm staging:public:fresh   # force rebuild
pnpm staging:public:stop    # stop
```

### What staging runs

- **App container** — all 7 Next.js apps served by nginx on port 8088
- **Supabase stack** — full self-hosted Supabase (db, auth/GoTrue, PostgREST, Realtime, Storage, Analytics, Studio, Kong) in Docker
- **Cloudflare tunnel** — optional sidecar that exposes the stack publicly

The Supabase stack is defined in `docker/compose.staging.yml`. On first start it runs all migrations and seeds the DB automatically. To reset the DB to a clean state:

```bash
docker volume rm candyshop-staging_db-data
```

---

## Cloud Develop Environment

`develop` is now wired to a dedicated cloud deployment workflow so collaborators can test from a browser without local installs.

### Deploy trigger

- Automatic on push to `develop` (workflow: `Deploy Develop Cloud`)
- Manual run from Actions (`workflow_dispatch`)

### Required GitHub environment

Create a GitHub environment named `develop-cloud` and set these secrets:

| Secret                              | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `DEVELOP_SERVER_HOST`               | SSH hostname through Cloudflare Access                               |
| `DEVELOP_SERVER_USER`               | SSH username on the server                                           |
| `DEVELOP_SERVER_SSH_KEY`            | private key used by the deploy workflow                              |
| `DEVELOP_SUPABASE_URL`              | Supabase Cloud project URL for develop                               |
| `DEVELOP_SUPABASE_ANON_KEY`         | Supabase anon key for develop                                        |
| `DEVELOP_SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for develop                                |
| `DEVELOP_BASE_URL`                  | Public base URL (example: `https://develop-store.furrycolombia.com`) |

Optional GitHub environment variables (with defaults):

| Variable                 | Default                                 |
| ------------------------ | --------------------------------------- |
| `DEVELOP_HOST_PORT`      | `9092`                                  |
| `DEVELOP_DEPLOY_DIR`     | `/home/furrycolombia/candyshop-develop` |
| `DEVELOP_CONTAINER_NAME` | `candyshop-develop`                     |
| `DEVELOP_IMAGE_NAME`     | `candyshop-develop`                     |

### Resulting runtime

- Deploy path on server: from `DEVELOP_DEPLOY_DIR`
- Container: from `DEVELOP_CONTAINER_NAME`
- Port: from `DEVELOP_HOST_PORT`
- Health check: `http://localhost:<DEVELOP_HOST_PORT>/health`

Point a Cloudflare tunnel hostname to `http://127.0.0.1:9092` so the environment is reachable from anywhere.

---

## E2E Testing

E2E tests use Playwright and run against a fully Dockerized stack. There are two environments:

### Standard e2e (isolated local Supabase on port 64321)

```bash
pnpm test:e2e                    # run all tests headless
pnpm test:e2e:headed             # run with visible browser
pnpm test:e2e:ui                 # open Playwright UI
pnpm test:e2e:debug              # Playwright inspector
pnpm test:e2e -- --spec <name>   # run a specific spec file
pnpm test:e2e -- --smoke         # smoke tests only
pnpm test:e2e:build              # build + start stack only (no tests)
pnpm test:e2e:down               # tear down e2e stack
pnpm test:e2e:rebuild            # force full image rebuild
```

The e2e environment:

- Builds the app Docker image with `localhost:8089` URLs
- Starts an isolated Supabase instance on port **64321** (separate from dev, never collides)
- Runs Playwright tests against `http://localhost:8089`
- Tears everything down after

### Staging e2e (full Supabase stack in Docker)

```bash
pnpm test:e2e -- --env staging           # headless against staging stack
pnpm test:e2e -- --env staging --headed  # with visible browser
pnpm test:e2e -- --env staging --rebuild # force image rebuild first
```

The staging e2e environment:

- Builds the app with `localhost:8088` URLs (local mode, no Cloudflare)
- Starts the full Supabase Docker stack (same as `pnpm staging`)
- Runs all Playwright tests against `http://localhost:8088`
- Tears down containers after (DB volume is preserved for speed)

> **First run is slow** (~3–5 min) because it builds the Docker image and initializes the DB. Subsequent runs reuse the image and volume and start in ~30s.

### Spec files

| Spec                               | What it tests                                     |
| ---------------------------------- | ------------------------------------------------- |
| `auth-session.spec.ts`             | Login page, session persistence across apps       |
| `google-login.spec.ts`             | Full Google OAuth flow                            |
| `full-purchase-flow.spec.ts`       | Two-seller purchase lifecycle end-to-end          |
| `checkout-stock-integrity.spec.ts` | Stock reservation and overstocked cart behavior   |
| `permission-management.spec.ts`    | Admin permission grant/revoke across all sections |
| `mobile-layout.spec.ts`            | Mobile viewport layout and sidebar behavior       |
| `smoke-all-apps.spec.ts`           | All apps load without errors                      |

---

## Supabase

### Local dev Supabase (port 54321)

```bash
pnpm supabase:start   # start local Supabase
pnpm supabase:stop    # stop
pnpm supabase:reset   # reset DB (re-runs migrations + seed)
```

### Migrations and seed

Migrations live in `supabase/migrations/`. Seed data is in `supabase/seed.sql`.

```bash
pnpm supabase:reset   # apply all migrations + seed on local DB
```

### Code generation (Supabase types)

```bash
pnpm codegen:supabase   # regenerate TypeScript types from local DB schema
pnpm codegen:all        # regenerate all (Orval + GraphQL + Supabase)
```

---

## Secrets

Secrets are stored in `.secrets` (gitignored) and referenced in env files as `$secret:KEY_NAME`.

```bash
pnpm sync-secrets     # pull secrets from GitHub repository secrets into .secrets
```

To set up manually, copy `.secrets.example` to `.secrets` and fill in the values.

Required secrets for staging and e2e:

| Key                                       | Used by                            |
| ----------------------------------------- | ---------------------------------- |
| `STAGING_SUPABASE_ANON_KEY`               | Staging app + tests                |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY`       | Staging tests (admin API)          |
| `STAGING_JWT_SECRET`                      | Staging Supabase stack             |
| `STAGING_POSTGRES_PASSWORD`               | Staging Supabase DB                |
| `E2E_SUPABASE_ANON_KEY`                   | E2E app container                  |
| `E2E_SUPABASE_SERVICE_ROLE_KEY`           | E2E tests (admin API)              |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Google OAuth (staging + e2e)       |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | Google OAuth (staging + e2e)       |
| `STAGING_CLOUDFLARE_TUNNEL_TOKEN`         | Cloudflare tunnel (staging public) |

---

## Code Quality

### Linting and formatting

```bash
pnpm lint             # ESLint across all workspaces
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)
pnpm check:style      # Stylelint + CSS sync check
```

### Tests

```bash
pnpm test             # unit tests (all workspaces)
pnpm test:watch       # unit tests in watch mode
pnpm test:coverage    # unit tests with coverage
```

### Pre-commit / pre-push hooks

These run automatically via Husky:

```bash
pnpm precommit        # lint-staged + lint + style + tools check
pnpm prepush          # typecheck + test:coverage + build + test:e2e
```

### Full quality check

```bash
pnpm check:tools      # cspell + knip + jscpd + ls-lint + madge + sherif + syncpack
```

---

## Architecture

### Monorepo structure

```
candyshop/
├── apps/
│   ├── store/        # Main storefront (reference standard for all apps)
│   ├── landing/      # Public landing page
│   ├── payments/     # Checkout and payment processing
│   ├── admin/        # Back-office (orders, inventory, permissions)
│   ├── auth/         # Authentication provider (Supabase / Keycloak / mock)
│   ├── studio/       # Seller dashboard (products, payment methods)
│   └── playground/   # Incubation sandbox — never delete
├── packages/
│   ├── api/          # Generated API hooks, types, HTTP client (Orval)
│   ├── ui/           # Shared UI components (shadcn/ui + Radix)
│   ├── shared/       # Shared utilities, hooks, constants
│   ├── auth/         # Auth domain logic and providers
│   └── app-components/ # App-level shared components (uses next-intl)
├── supabase/         # Migrations, seed, local Supabase config
├── supabase-e2e/     # Isolated Supabase config for e2e (port 64321)
├── docker/           # Docker Compose files and Supabase init scripts
│   ├── compose.yml           # Staging app (uses local/cloud Supabase)
│   ├── compose.staging.yml   # Staging app + full Supabase stack
│   └── compose.e2e.yml       # E2E app container
└── scripts/          # Node.js automation scripts
```

### Each app follows Clean Architecture

```
src/features/<feature>/
├── domain/           # Types, interfaces, business rules
├── application/      # Hooks, use cases, state
├── infrastructure/   # API calls, storage, external services
└── presentation/     # React components and pages
```

### Tech stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Framework | Next.js 16 + React 19 + TypeScript          |
| Styling   | Tailwind CSS v4 + shadcn/ui + Radix UI      |
| State     | TanStack Query + nuqs                       |
| API       | Axios + Orval (codegen)                     |
| Auth      | Supabase Auth (Google, Discord OAuth)       |
| DB        | Supabase (PostgreSQL + PostgREST + GoTrue)  |
| i18n      | next-intl (EN + ES)                         |
| Testing   | Vitest + Testing Library + Playwright + MSW |
| Infra     | Docker + nginx + Cloudflare Tunnel          |

---

## Machine Recovery

If this machine gets formatted and you need to bring the public site back up:

```bash
pnpm install
pnpm sync-secrets                        # restore secrets from GitHub
pnpm setup:cloudflare --token <token>    # configure Cloudflare tunnel
pnpm staging:tunnel                      # build + start + expose publicly
```

On Windows you can also use:

```powershell
pnpm staging:public
```

The site will be live at `https://store.ffxivbe.org` once the tunnel connects.

---

## Environment files

| File           | Purpose                                    | Committed |
| -------------- | ------------------------------------------ | --------- |
| `.env.dev`     | Local dev — Supabase CLI on port 54321     | ✅        |
| `.env.test`    | Isolated test — Supabase CLI on port 64321 | ✅        |
| `.env.staging` | Staging — Docker app + Docker Supabase     | ✅        |
| `.env.prod`    | Production — Docker app + Supabase Cloud   | ✅        |
| `.secrets`     | Resolved secret values (never committed)   | ❌        |

Secrets in env files use `$secret:KEY_NAME` syntax and are resolved at runtime by `scripts/load-env.mjs`. Run `pnpm sync-secrets` to pull them from GitHub.

See **[docs/environment.md](docs/environment.md)** for the full reference — how ports are derived, how Docker images are built, how Supabase is configured, and how the Cloudflare tunnel works.
