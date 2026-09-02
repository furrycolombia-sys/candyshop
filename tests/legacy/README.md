# Legacy test snapshot

A frozen copy of every test file as it stood **before** the test-architecture
rework, taken at the commit that added `tests/INVENTORY.md`.

Original paths are preserved, so `tests/legacy/apps/store/src/features/cart/
application/CartContext.test.tsx` is exactly where that file lived.

## Why a copy when git already has the history

Two different questions get asked during a rework, and git answers only one of
them conveniently.

- *Did we keep every case?* — that is `tests/INVENTORY.md`, which lists every
  case by file, suite and name. Regenerate it and diff.
- *What did the old test actually assert?* — that is this folder. When you are
  rewriting a test rather than moving it, you want the old body side by side
  with the new one, not a `git show` per file.

## Rules

**Nothing here runs.** It is excluded from vitest, eslint, prettier, cspell,
knip and jscpd. Treat it as read-only reference material: fixing something in
here fixes nothing.

**Delete it when the rework is done**, together with this README, once
`tests/INVENTORY.md` has been regenerated and diffed clean. A snapshot that
outlives its comparison is just a second copy of the codebase drifting out of
date — which is the exact failure mode the duplicate `packages/ui` components
had before they were deleted.
