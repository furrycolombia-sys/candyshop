# Implementation Plan: GH-183 — E2E Test Suite Coverage Refactor

## Overview

Delete 6 redundant E2E spec files. Zero behavioral coverage is lost. All 10
critical paths identified in the analysis remain fully covered by the 16
remaining files.

---

## Files to Delete

| #   | File                                                | Reason                                                               |
| --- | --------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | `apps/auth/e2e/discord-login.spec.ts`               | Always `test.skip(true, ...)` — never runs in CI                     |
| 2   | `apps/auth/e2e/google-login.spec.ts`                | Always `test.skip(true, ...)` — never runs in CI                     |
| 3   | `apps/auth/e2e/screenshot-proof.spec.ts`            | Behavioral duplicate of `studio-ux-improvements.spec.ts`             |
| 4   | `apps/auth/e2e/auth-session.spec.ts`                | All active tests covered by `smoke-all-apps.spec.ts`                 |
| 5   | `apps/admin/e2e/users-export-receipts-real.spec.ts` | Wave 3 — identical to Wave 4 (`admin-users-export-receipts.spec.ts`) |
| 6   | `apps/admin/e2e/users-export-receipts.spec.ts`      | Wave 2 — superseded by Wave 4 (filename-only check)                  |

## Files to Keep (16)

All files with unique coverage are preserved as-is. No content changes.

---

## Acceptance Criteria Mapping

| Criterion                                               | How It's Met                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Reduce total E2E tests without losing critical coverage | 22 → 16 files; all 10 critical paths retained                                   |
| Merge Wave 3 into Wave 4 (only duplicate pair)          | Wave 3 deleted; Wave 4 (`admin-users-export-receipts.spec.ts`) is authoritative |
| Multi-seller cart count=2 preserved                     | `full-purchase-flow.spec.ts` Phases 3–6 untouched                               |
| Seller data isolation preserved                         | `seller-reports.spec.ts` untouched                                              |
| Ghost-write regression GH-179 preserved                 | `checkout-order-integrity.spec.ts` untouched                                    |
| SHA-256 byte receipt verification preserved             | `receipt-reference-flow.spec.ts` + `receipt-delegate-flow.spec.ts` untouched    |
| All remaining tests pass in CI                          | No logic changes — deletions only                                               |

---

## Implementation Steps

1. `git rm apps/auth/e2e/discord-login.spec.ts`
2. `git rm apps/auth/e2e/google-login.spec.ts`
3. `git rm apps/auth/e2e/screenshot-proof.spec.ts`
4. `git rm apps/auth/e2e/auth-session.spec.ts`
5. `git rm apps/admin/e2e/users-export-receipts-real.spec.ts`
6. `git rm apps/admin/e2e/users-export-receipts.spec.ts`

No other files require modification. No imports to update. No test fixtures
or helpers referenced exclusively by deleted files.

---

## Risk Assessment

| Risk                                       | Likelihood | Mitigation                                               |
| ------------------------------------------ | ---------- | -------------------------------------------------------- |
| CI test suite fails due to deleted file    | Low        | Deletions only remove always-skipped or duplicate tests  |
| Unique coverage accidentally removed       | None       | Analysis confirmed zero unique coverage in deleted files |
| Playwright config references deleted files | None       | Config uses glob `**/*.spec.ts` — no explicit file list  |
