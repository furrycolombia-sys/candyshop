# Implementation Log: GH-183

## Changes Made

### Deleted Files (6)

| File                                                | Reason                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| `apps/auth/e2e/discord-login.spec.ts`               | Always `test.skip(true, ...)` — never ran in CI          |
| `apps/auth/e2e/google-login.spec.ts`                | Always `test.skip(true, ...)` — never ran in CI          |
| `apps/auth/e2e/screenshot-proof.spec.ts`            | Behavioral duplicate of `studio-ux-improvements.spec.ts` |
| `apps/auth/e2e/auth-session.spec.ts`                | Active tests fully covered by `smoke-all-apps.spec.ts`   |
| `apps/admin/e2e/users-export-receipts-real.spec.ts` | Wave 3 — identical coverage to Wave 4                    |
| `apps/admin/e2e/users-export-receipts.spec.ts`      | Wave 2 — filename-only check, superseded by Wave 4       |

### Modified Files

None. Implementation is deletions only.

---

## Git Status

```
deleted: apps/admin/e2e/users-export-receipts-real.spec.ts
deleted: apps/admin/e2e/users-export-receipts.spec.ts
deleted: apps/auth/e2e/auth-session.spec.ts
deleted: apps/auth/e2e/discord-login.spec.ts
deleted: apps/auth/e2e/google-login.spec.ts
deleted: apps/auth/e2e/screenshot-proof.spec.ts
```

---

## Acceptance Criteria Status

- [x] Reduce total E2E tests without losing critical coverage (22 → 16 files)
- [x] Merge Wave 3 into Wave 4 (Wave 3 deleted; Wave 4 is authoritative)
- [x] Preserve multi-seller cart `count=2` assertions (`full-purchase-flow.spec.ts` untouched)
- [x] Preserve seller data isolation (`seller-reports.spec.ts` untouched)
- [x] Preserve ghost-write regression GH-179 (`checkout-order-integrity.spec.ts` untouched)
- [x] Preserve SHA-256 byte receipt verification (both receipt spec files untouched)
- [ ] All remaining tests pass in CI (pending — see `05-testing-results.md`)
