# Candy Shop

A store and payment platform for selling products, services, tickets, promos, coupons, and other goods.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Start individual apps
pnpm dev:store      # http://localhost:5001
pnpm dev:landing    # http://localhost:5004
pnpm dev:payments   # http://localhost:5005
pnpm dev:admin      # http://localhost:5002
pnpm dev:auth       # http://localhost:5000
pnpm dev:playground # http://localhost:5003
```

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
