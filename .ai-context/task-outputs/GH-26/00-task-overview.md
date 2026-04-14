# Task Overview: GH-26

## Issue Details

| Field         | Value                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| **Issue**     | #26                                                                       |
| **Title**     | chore: Full project code review — 5 critical, 34 warnings, 26 suggestions |
| **Type**      | chore                                                                     |
| **Labels**    | tech-debt                                                                 |
| **Assignee**  | —                                                                         |
| **Milestone** | —                                                                         |
| **Created**   | 2026-03-31                                                                |

## Description

Full project code review addressing critical issues, warnings, and suggestions found across the monorepo.

## Acceptance Criteria

- [ ] All 5 critical issues resolved
- [ ] Top-priority warnings addressed (security, bugs, missing tests)
- [ ] DRY violations consolidated
- [ ] Styling issues fixed
- [ ] Quality gates pass (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`)

## Critical Issues (5)

1. **ARCH-001** — Cross-feature import: Dashboard imports from Audit
2. **ARCH-002** — Hardcoded stat values in DashboardPage
3. **SEC-001** — Supabase anon key in `.env.example`
4. **BUG-001** — `getInitials()` crashes on empty email
5. **BUG-002** — No error boundaries in any app

## Dependencies

- Full report: `.ai-context/reports/full-code-review_2026-03-30.md`
