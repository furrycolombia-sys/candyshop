---
inclusion: always
---

# Git Quality Rules

## NEVER skip hooks or tests

- NEVER use `--no-verify` on git commits or pushes
- NEVER use `--skip-checks` flags
- NEVER modify test cases to make them pass unless the underlying functionality actually changed
- If a pre-commit or pre-push hook fails, fix the actual code issue — do not bypass it
- If tests fail, fix the code (or the test setup) — do not skip or disable tests

## NEVER bypass errors

- NEVER use `test.skip()` to hide a failing test — fix the root cause
- NEVER exclude failing specs from the test suite to make CI green
- NEVER add `// eslint-disable` or `@ts-ignore` to silence errors caused by your changes
- NEVER stub env vars or mock modules just to avoid fixing the real issue
- If a test fails because the environment changed, update the test to properly isolate itself (stub env vars, clear state)
- If a test fails because the code changed, update the test assertions to match the new behavior
- If a feature doesn't work in a specific environment (e.g. Docker), fix the feature — don't skip the test

## When tests fail

1. Run the failing test in isolation to understand the actual error
2. Fix the source code if the behavior is wrong
3. Fix the test setup/mocks if the environment is broken
4. Only update a test's assertions if the feature's intended behavior genuinely changed
