# Setup: GH-188

## Branch Information

| Field         | Value                            |
| ------------- | -------------------------------- |
| **Branch**    | `feat/GH-188_Reduce-Deploy-Time` |
| **Source**    | `develop`                        |
| **PR Target** | `develop`                        |
| **Created**   | 2026-04-24                       |

## Environment

- Node.js: 24
- Package Manager: pnpm
- Framework: Next.js (monorepo)

## Quick Links

- [GitHub Issue](https://github.com/furrycolombia-sys/candyshop/issues/188)
- [ci.yml](.github/workflows/ci.yml)
- [deploy-production.yml](.github/workflows/deploy-production.yml)
- [deploy-production.sh](scripts/deploy-production.sh)

## Next Steps

1. Remove `ci-gate` from `deploy-production.yml`
2. Add build job with prod secrets + artifact upload to `deploy-production.yml`
3. Add rsync transfer step to `deploy` job
4. Rewrite `deploy-production.sh` to receive artifacts (skip `pnpm build`)
5. Remove "Rebuild E2E apps locally" step from `ci.yml`
6. Add `.next` build cache to `build` job in `ci.yml`
7. Add Playwright browser cache to `e2e-tests` job in `ci.yml`
