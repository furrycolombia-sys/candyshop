---
inclusion: always
---

# PR & Branch Conventions

## PR Title Format (Conventional Commits)

PR titles MUST follow this format: `type: subject`

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`

**Subject:** max 80 characters, no period at end.

### Examples

```
feat: add user authentication
fix: resolve login error on mobile
chore: release 2026-04-15 — admin delegates and env management
refactor: extract shared admin REST utilities
docs: update README with new env setup
```

### Release PRs

Release PRs (release/\* → main) must use `chore:` type:

```
chore: release 2026-04-15 — brief description of changes
```

NOT `release:` — that type is not in the allowed list.

## Branch Naming

- Feature branches: `feat/description` → target `develop`
- Bug fixes: `fix/description` → target `develop`
- Release branches: `release/YYYY-MM-DD` → target `main`
- Hotfixes: `fix/description` → can target `main`

## Merge Strategy

- Feature/fix PRs into develop: **squash merge**
- Release PRs into main: **merge commit** (preserves history)
