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

## When tests fail

1. Run the failing test in isolation to understand the actual error
2. Fix the source code if the behavior is wrong
3. Fix the test setup/mocks if the environment is broken
4. Only update a test's assertions if the feature's intended behavior genuinely changed
