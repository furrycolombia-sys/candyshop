# Production status & restore path

> **Current state: production is OFFLINE.** Last served 2026-08-07. This
> document exists so nobody has to re-derive the situation from scratch.
> Written 2026-08-09.

## What happened

The **GCP free trial ended**. Google suspended the project, which stopped the
VM, which killed the `cloudflared` process running the production tunnel. Every
production hostname has returned Cloudflare **530 / error 1033** ("no tunnel
connected") ever since.

Dated from the repo webhook's delivery log, which is the most precise record we
have:

| when (UTC)                | webhook response  | meaning                                     |
| ------------------------- | ----------------- | ------------------------------------------- |
| 2026-08-07 17:36 → 18:03  | `404`, empty body | tunnel **connected**, no route for the host |
| 2026-08-08 02:27 → onward | `530` / `1033`    | **no tunnel connected at all**              |

The last successful deploy — and therefore the newest built image — is
**2026-07-08**. The site kept serving that image for a month until the VM died;
"last deploy" and "went offline" are a month apart and should not be confused.

**Nothing in the repo caused this.** The repository transfer, the rename to
Libra, and the workflow changes all happened around the same window, which makes
for an alarming coincidence, but none of them touch the VM, Cloudflare, or GCP.

## What this means going forward

GCP is not coming back: restoring it needs a paid billing account, and **paying
anything is a hard stop**. The deploy workflows (`deploy-gcp.yml`,
`deploy-local.yml`, `deploy-production.yml`) were deleted for that reason — each
pointed at a host that no longer exists. They are in git history.

## Domain topology — read this before touching Cloudflare

This is the part that is easy to get wrong, and was got wrong during the
2026-08-09 investigation — an hour went into testing the wrong domain:

| domain              | role                | notes                                            |
| ------------------- | ------------------- | ------------------------------------------------ |
| `furrycolombia.com` | **production**      | `store.furrycolombia.com` is the real storefront |
| `ffxivbe.org`       | **staging / local** | app hostnames here are _not_ production          |
| `ffxiv.be`          | dev tooling         | console, code-server, ttyd — the PCSetup tunnels |

Three secrets are misleadingly named and have cost time already:

- **`PROD_CF_ZONE_ID` holds the `ffxivbe.org` zone** — a staging zone under a
  "PROD" name. Using it with `PROD_CF_API_TOKEN` produces a confusing
  "unauthorized" error, because the token is scoped to the _other_ domain.
- **`PROD_CF_API_TOKEN` does reach `furrycolombia.com`**, but only for
  **zone-read and cache-purge**. DNS read returns `403`.
- **`CLOUDFLARED_CONFIG` / `CLOUDFLARED_TUNNEL_CREDENTIALS`** are the
  **staging** tunnel's, despite the generic names — their ingress lists
  `ffxivbe.org` hostnames. They are stored base64-encoded with a `_BASE64`
  suffix because they are multi-line; searching `.secrets` for the bare name
  finds nothing.

## Why the old tunnel cannot simply be restarted

The production tunnel (`libra-prod`) was created **on the VM**, so its
credentials died with the disk. It is not merely disconnected: listing tunnels
in the production Cloudflare account returns **zero**. There is nothing to
reattach and nothing to recover — a new tunnel has to be created.

## What is already in place

Verified working 2026-08-09:

- **The production Supabase project is alive** — `/auth/v1/health` answers
  `401`, meaning up and requiring auth, not paused.
- **The known-good image exists**: digest `c60338c1…`, the 2026-07-08 build.
  Present locally and in GHCR under both the old and new names.
- **Docker and `cloudflared` are installed** on the workstation, and a
  `cloudflared` already runs there for the dev console.
- **The container recipe** is in `scripts/deploy-production.sh`: published as
  `-p 9090:8080`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`,
  `--pids-limit=1024`, `--restart unless-stopped`, `--env-file`.

## The one missing piece

**A Cloudflare API token for the `furrycolombia.com` account with
`Account → Cloudflare Tunnel → Edit` and `Zone → DNS → Edit`.** Everything else
is ready; without it neither the tunnel nor the DNS record can be created.

Create it under **My Profile → API Tokens** in the Cloudflare account that owns
`furrycolombia.com`, and store it as a repository secret — suggested name
`PROD_CF_TUNNEL_TOKEN`, to avoid inheriting the naming confusion above.

## Restore runbook

Once that token exists:

1. **Create a tunnel** in the production account, e.g. `libra-prod`, and save
   its credentials as a repository secret so the next rebuild does not repeat
   this exercise.
2. **Write an ingress config** mapping `store.furrycolombia.com` (and any other
   hostnames wanted) to `http://localhost:9090`.
3. **Start the container** from the recipe above, with runtime env resolved for
   `prod` (`scripts/load-env.mjs` resolves `$secret:` references from
   `.secrets` — do **not** set `CI=true`, which makes it skip that file).
4. **Point DNS** — `store.furrycolombia.com` CNAME to
   `<tunnel-uuid>.cfargotunnel.com`, proxied.
5. **Verify** the hostname returns `200`, not `530`.

### Decide these before starting

- **The host would be the workstation**, so the store is online only while that
  machine is. For a shop with no active users this may be fine; it is still a
  change in what "production" means.
- **The image is the 2026-07-08 build**, which predates the Libra rename. The
  renamed build changes the cart cookie, the checkout session key and the
  permission cache key, so deploying it drops existing carts. Bringing back the
  old image first is the lower-risk order.
- **It talks to live production Supabase.** Serving traffic is normal use; the
  standing rule against running anything _against_ that database still applies.
