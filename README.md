# Candy Shop

A store and payment platform for selling products, services, tickets, promos, coupons, and other goods.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Start local stack + Cloudflare tunnel (if configured in .env)
pnpm site:up:cloudflare

# Start the Dockerized local production build
pnpm site:prod

# Start the Dockerized local production build + Cloudflare tunnel
pnpm site:prod:cloudflare

# Start the current public-subdomain production stack on this Windows machine
pnpm site:prod:public


# Start individual apps
pnpm dev:store      # http://localhost:5001
pnpm dev:landing    # http://localhost:5004
pnpm dev:payments   # http://localhost:5005
pnpm dev:admin      # http://localhost:5002
pnpm dev:auth       # http://localhost:5000
pnpm dev:playground # http://localhost:5003
```

## Recovering A Machine

If this PC gets formatted and you need to bring the public site back up:

```bash
pnpm install
pnpm setup:cloudflare --token <your-token>
pnpm site:up:cloudflare
```

You can use `--name` or `--args` instead of `--token` depending on how your
Cloudflare tunnel is managed.

On Windows, you can also use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-machine.ps1 -TunnelToken <your-token>
pnpm site:up:cloudflare
```

Or from `cmd.exe` / a double-clickable batch file entrypoint:

```bat
scripts\setup-machine.bat -TunnelToken <your-token>
pnpm site:up:cloudflare
```

If you want a dedicated recovery template, use:

- [.env.recovery.example](/Z:/Github/candystore/.env.recovery.example)

## Local Production On This Machine

For a production-oriented local setup, use the Dockerized runtime instead of
`pnpm dev`:

```bash
pnpm site:prod
```

That command:

- builds the combined production Docker image
- replaces the existing local production container
- starts it with `--restart unless-stopped`
- serves the full site on `http://localhost:8088` by default

## Checkout Security Invariant

Cart and checkout must preserve stock integrity:

- store cart actions must not increase quantity beyond `max_quantity`
- checkout must re-validate stock on the backend before returning seller
  payment information
- when stock is invalid, checkout may show the warning state but must return no
  payment details

The canonical rule is:

- [.claude/rules/checkout-stock-integrity.md](/Z:/Github/candystore/.claude/rules/checkout-stock-integrity.md)
- [docs/standards/checkout-stock-integrity.md](/Z:/Github/candystore/docs/standards/checkout-stock-integrity.md)

To stop it:

```bash
pnpm site:prod:stop
```

To expose it through Cloudflare Tunnel:

```bash
pnpm setup:cloudflare --token <your-token>
pnpm site:prod:cloudflare
```

If you want the existing public subdomains already defined in the local
`cloudflared` config (`landing.*`, `store.*`, `admin.*`, etc.), use:

```bash
pnpm site:prod:public
```

That command:

- starts Supabase if needed
- builds the apps for production
- starts each app with `next start` on ports `5000-5006`
- starts `cloudflared` using the local `~/.cloudflared/config.yml`

To stop that public stack:

```bash
pnpm site:prod:public:stop
```

Recommended `.env` values for public use:

```dotenv
SITE_PUBLIC_ORIGIN=https://shop.example.com
# If Supabase auth is public, this must also be publicly reachable
NEXT_PUBLIC_SUPABASE_URL=https://supabase.example.com
```

Notes:

- `SITE_PUBLIC_ORIGIN` automatically derives the app URLs for `/store`,
  `/admin`, `/payments`, `/studio`, `/auth`, and `/playground`.
- If `AUTH_PROVIDER_MODE=supabase`, do not leave `NEXT_PUBLIC_SUPABASE_URL`
  pointed at `localhost` for public traffic.

## Architecture

This is a **pnpm workspace monorepo** with multiple Next.js applications sharing common packages.

### Apps

| App          | Port | Description                                     |
| ------------ | ---- | ----------------------------------------------- |
| `store`      | 5001 | Main storefront — products, services, tickets   |
| `landing`    | 5004 | Public landing page                             |
| `payments`   | 5005 | Payment processing and checkout                 |
| `admin`      | 5002 | Back-office — inventory, orders, promos         |
| `auth`       | 5000 | Authentication provider (mock/backend/keycloak) |
| `playground` | 5003 | Incubation sandbox for experiments              |

### Packages

| Package          | Description                                  |
| ---------------- | -------------------------------------------- |
| `api`            | Generated API hooks, types, HTTP client      |
| `ui`             | Shared UI components (shadcn/ui + Radix)     |
| `shared`         | Shared utilities, hooks, types               |
| `auth`           | Authentication domain logic and providers    |
| `app-components` | App-level shared components (with next-intl) |

### Tech Stack

- **Next.js 16** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** + **Radix UI**
- **TanStack Query** + **Axios** + **Orval** (API codegen)
- **Vitest** + **Testing Library** + **Playwright** + **MSW**
- **next-intl** (i18n)

## License

MIT
