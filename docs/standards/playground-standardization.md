# Playground Standardization

This document tracks the standardization baseline for `apps/playground`.

## Scope

- Align architecture and developer workflow with the other microfrontends.
- Ensure local hooks and CI use the same scoped selection logic.
- Keep generated/runtime artifacts out of git.

## Decisions

1. Shared scope selection logic

- Added `scripts/select-workspaces.sh` as the single source of truth to determine:
  - `RUN_ALL`
  - selected apps (`APPS`)
  - lint targets (`LINT_TARGETS`)
- Reused by:
  - `.husky/pre-push`
  - `.github/workflows/ci.yml`

2. Local/CI quality parity

- `pre-push` now runs `pnpm format:check` and scoped/full lint before typecheck/test/build/e2e.
- CI quality/unit/build/e2e scoped execution now consumes the same workspace selector script.

3. Playground layout alignment

- Added reusable workspace layout primitives in `apps/playground/src/shared/presentation/layouts/`.
- Refactored mining page to use `WorkspaceWithSideContentLayout` for consistent sidebar/main behavior.

4. PR checks consistency

- Added `playground` change detection and summary visibility in `.github/workflows/pr-checks.yml`.

5. Script parity policy

- Required scripts for all Next apps: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage`, `test:e2e`.
- Optional scripts (for example app-specific i18n maintenance) are intentionally app-dependent.

## Checklist

- [x] Playground included in change detection and scoped pipelines.
- [x] Local pre-push and CI share scoped workspace selection logic.
- [x] Playground mining page uses reusable workspace layout.
- [x] Developer docs updated with playground app and ports.
- [x] Generated/runtime artifacts remain ignored at repository level.
