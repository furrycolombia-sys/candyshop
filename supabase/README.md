# Supabase Configuration

This directory contains the Supabase configuration for local development and testing.

## Files

- **`config.toml.template`** - Template configuration file (source of truth)
- **`config.toml`** - Generated temporary file (gitignored, auto-created by script)
- **`seed.sql`** - Database seed data
- **`migrations/`** - Database migration files

## How It Works

The `scripts/supabase-docker.mjs` script:

1. Loads environment variables from `.env.<targetEnv>`
2. Copies `config.toml.template` to `config.toml`
3. Supabase CLI reads `config.toml` and resolves `env(VAR_NAME)` references
4. Cleans up `config.toml` on exit

This ensures:

- No hardcoded credentials in config files
- Each environment uses its own Supabase URL, keys, and OAuth settings
- The generated config is never committed to git

## Running Supabase

### Start Supabase (dev environment)

```bash
pnpm supabase:docker start --env dev
```

### Start with different environment

```bash
pnpm supabase:docker start --env staging
```

### Stop Supabase

```bash
pnpm supabase:docker stop --env dev
```

### Reset database

```bash
pnpm supabase:docker reset --env dev
```

### Check status

```bash
pnpm supabase:docker status --env dev
```

## Environment Configuration

Each `.env.<targetEnv>` file specifies:

```bash
# Supabase connection
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$secret:DEV_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$secret:DEV_SUPABASE_SERVICE_ROLE_KEY

# OAuth configuration
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=$secret:...
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=$secret:...
SUPABASE_AUTH_EXTERNAL_REDIRECT_URI=http://127.0.0.1:54321/auth/v1/callback
SUPABASE_AUTH_SITE_URL=http://localhost:7001/auth/callback
```

## Switching Environments

To switch to a different Supabase instance:

1. Stop current instance: `pnpm supabase:docker stop --env dev`
2. Start new instance: `pnpm supabase:docker start --env staging`

All environments use the same ports (54321-54329) - only one instance runs at a time.

## Important Notes

- **Never commit `config.toml`** - It's auto-generated and gitignored
- **Always edit `config.toml.template`** - This is the source of truth
- **Cleanup is automatic** - The script removes `config.toml` on exit
- **One instance at a time** - Stop one environment before starting another

## Troubleshooting

### Port already in use

Stop the running Supabase instance first: `pnpm supabase:docker stop`

### Config.toml not found

The script generates it automatically. Check that `config.toml.template` exists.

### Changes not taking effect

Stop Supabase, update your env file, and start again.
