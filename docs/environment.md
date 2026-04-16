# Environment System

## Overview

The monorepo uses a custom env loader (`scripts/load-env.mjs`) that loads a target env file, resolves `$secret:` references, and injects everything into `process.env` before any app starts.

```
pnpm dev              → loads .env.dev   (default)
pnpm dev --env test   → loads .env.test
pnpm build            → loads .env.prod  (default)
pnpm build --env staging → loads .env.staging
```

---

## Env Files

All env files live at the monorepo root. Every file must have **exactly the same keys** — enforced by `pnpm lint:env`.

| File           | Purpose                             | Committed              |
| -------------- | ----------------------------------- | ---------------------- |
| `.env.dev`     | Local dev (Supabase CLI, localhost) | ✅                     |
| `.env.test`    | Isolated test runs                  | ✅                     |
| `.env.staging` | Docker stack + Cloudflare tunnel    | ✅                     |
| `.env.prod`    | Production (Supabase Cloud)         | ✅                     |
| `.env.backup`  | Manual backup snapshot              | ✅ (ignored by linter) |
| `.secrets`     | Resolved secret values              | ❌                     |

### Key variables

| Variable        | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `TARGET_ENV`    | Which env is active (`dev`, `test`, `staging`, `prod`)            |
| `APPS_MODE`     | `local` = Next.js dev servers, `docker` = nginx container         |
| `SUPABASE_MODE` | `local` = CLI, `docker` = Compose stack, `cloud` = Supabase Cloud |
| `TUNNEL_MODE`   | `none` = localhost only, `cloudflare` = public tunnel             |
| `ENV_DEBUG`     | `true` = serialize all resolved vars into `NEXT_PUBLIC_ENV_DEBUG` |

---

## Secret References

Values in env files can reference secrets using `$secret:KEY_NAME` syntax:

```dotenv
NEXT_PUBLIC_SUPABASE_ANON_KEY=$secret:DEV_SUPABASE_ANON_KEY
```

**Locally:** resolved from `.secrets` file (gitignored, sync with `pnpm sync-secrets`).

**CI/GitHub Actions:** set `CI=true` and inject secrets directly as env vars — the loader skips `.secrets` and uses `process.env` directly.

```yaml
env:
  CI: true
  DEV_SUPABASE_ANON_KEY: ${{ secrets.DEV_SUPABASE_ANON_KEY }}
```

---

## How the Loader Works

`scripts/load-env.mjs` — called by `scripts/start.mjs` and `scripts/build.mjs` before turbo runs.

1. Reads `.env.{targetEnv}`
2. Resolves `$secret:KEY` refs from `.secrets` (or `process.env` in CI)
3. Writes resolved vars into `process.env` (existing vars win — CLI/CI overrides are preserved)
4. Sets `TARGET_ENV=<env>` in `process.env`
5. If `ENV_DEBUG=true`, serializes all resolved vars into `NEXT_PUBLIC_ENV_DEBUG` (JSON)

Turbo then spawns all Next.js apps which inherit the populated `process.env`.

---

## Env Linter

```bash
pnpm lint:env
```

Checks that all `.env.X` files have exactly the same set of keys. Fails if any file has more or fewer keys than the others. `.env.backup` is excluded.

Run this after adding or removing any variable from any env file.

---

## Debug Viewer

When `ENV_DEBUG=true` (set in `.env.dev` and `.env.test`), the loader serializes all resolved vars (including secrets) into `NEXT_PUBLIC_ENV_DEBUG`.

View them at: **http://localhost:5003/en/env** (playground app)

`NEXT_PUBLIC_ENV_DEBUG` is only used by the playground env viewer. It is never read by any app code.

Set `ENV_DEBUG=false` in staging and prod to disable this.

---

## Adding a New Variable

1. Add it to **all** env files (`.env.dev`, `.env.test`, `.env.staging`, `.env.prod`) with appropriate values
2. If it's a secret, use `$secret:KEY_NAME` and add the actual value to `.secrets`
3. Run `pnpm lint:env` to verify all files are in sync
4. If it needs to be available in Next.js server components, prefix with `NEXT_PUBLIC_` or add it to `turbo.json` `globalEnv`
