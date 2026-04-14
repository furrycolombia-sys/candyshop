---
name: run-tests
description: Run unit tests with Vitest. Supports running all tests, specific files, watch mode, and coverage reports.
---

# Run Tests

## Description

Executes unit tests using Vitest and React Testing Library. This skill runs tests, analyzes results, and provides actionable feedback on failures.

---

## Usage

```
/run-tests [options] [files]
```

Or natural language:

```
Run the tests
Run tests for LoginForm
Run tests with coverage
Run tests in watch mode
```

## Parameters

| Parameter            | Required | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| `files`              | No       | Specific test files or patterns (default: all tests) |
| `--watch`            | No       | Run tests in watch mode                              |
| `--coverage`         | No       | Generate coverage report                             |
| `--ui`               | No       | Open Vitest UI                                       |
| `--changed`          | No       | Run only tests for changed files                     |
| `--filter <pattern>` | No       | Filter tests by name pattern                         |

---

## Steps

### Step 1: Check Test Configuration

Verify Vitest is configured:

```bash
# Check for vitest config
ls vitest.config.ts || ls vite.config.ts
```

If not configured, inform user to set up Vitest first.

### Step 2: Determine Test Scope

Based on parameters:

| Input        | Command                  |
| ------------ | ------------------------ |
| No args      | `pnpm test`              |
| File path    | `pnpm test -- {file}`    |
| `--watch`    | `pnpm test:watch`        |
| `--coverage` | `pnpm test:coverage`     |
| `--changed`  | `pnpm test -- --changed` |

### Step 3: Run Tests

Execute the appropriate command:

```bash
# All tests
pnpm test

# Specific file
pnpm test -- LoginForm.test.tsx

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage

# Filter by test name
pnpm test -- --testNamePattern="should handle login"
```

For E2E specific files, see [Run E2E](../run-e2e/SKILL.md).

### Step 4: Analyze Results

Parse test output and provide summary:

```markdown
## Test Results

**Status:** PASS / FAIL
**Total:** X tests
**Passed:** X
**Failed:** X
**Skipped:** X
**Duration:** X.Xs

### Failed Tests (if any)

| Test             | File               | Error       |
| ---------------- | ------------------ | ----------- |
| should render... | LoginForm.test.tsx | Expected... |

### Suggested Fixes

1. **LoginForm.test.tsx:45** - Element not found
   - Check if component renders the expected element
   - Verify async operations are awaited
```

### Step 5: Coverage Report (if requested)

```markdown
## Coverage Report

| File          | Statements | Branches | Functions | Lines |
| ------------- | ---------- | -------- | --------- | ----- |
| LoginForm.tsx | 85%        | 70%      | 90%       | 85%   |
| useAuth.ts    | 95%        | 80%      | 100%      | 95%   |

### Uncovered Areas

- `LoginForm.tsx:45-50` - Error handling branch
- `useAuth.ts:23` - Token refresh logic
```

---

## Test Commands

These commands should be available in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Examples

### Example 1: Run All Tests

```
/run-tests
```

**Output:**

```
Running all unit tests...

✓ src/features/auth/presentation/components/LoginForm.test.tsx (3 tests) 45ms
✓ src/features/auth/application/hooks/useAuth.test.ts (5 tests) 32ms
✓ src/shared/application/utils/validation.test.ts (8 tests) 12ms

Test Files  3 passed (3)
     Tests  16 passed (16)
  Duration  1.23s

All tests passed!
```

### Example 2: Run Specific File

```
/run-tests LoginForm
```

Finds and runs tests matching "LoginForm":

```
Running tests matching: LoginForm

✓ src/features/auth/presentation/components/LoginForm.test.tsx (3 tests) 45ms

Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  0.45s
```

### Example 3: Run with Coverage

```
/run-tests --coverage
```

**Output:**

```
Running tests with coverage...

✓ All tests passed

## Coverage Summary

| Category | Coverage |
|----------|----------|
| Statements | 82.5% |
| Branches | 75.0% |
| Functions | 88.2% |
| Lines | 83.1% |

Files below threshold (80%):
- src/features/orders/OrderList.tsx: 65% lines
```

### Example 4: Watch Mode

```
/run-tests --watch
```

**Output:**

```
Starting Vitest in watch mode...

Watching for file changes. Press 'q' to quit.

Tip: Use `/run-tests` without --watch to run once and see results.
```

### Example 5: Run Changed Files Only

```
/run-tests --changed
```

Runs tests only for files changed since last commit:

```
Running tests for changed files...

Changed files detected:
- src/features/auth/presentation/components/LoginForm.tsx

Running related tests:
✓ LoginForm.test.tsx (3 tests) 45ms

Test Files  1 passed (1)
     Tests  3 passed (3)
```

---

## Handling Failures

When tests fail, provide actionable guidance:

### Common Failure Patterns

| Error                               | Likely Cause             | Solution                                    |
| ----------------------------------- | ------------------------ | ------------------------------------------- |
| "Unable to find element"            | Element not rendered     | Check if component renders conditionally    |
| "Expected X to equal Y"             | Assertion mismatch       | Verify expected values match implementation |
| "act() warning"                     | Unmocked async operation | Wrap in act() or use findBy\* queries       |
| "Cannot read property of undefined" | Missing mock/prop        | Add mock or provide required prop           |

### Debugging Tips

1. **Run single test:**

   ```bash
   npm run test -- --testNamePattern="specific test name"
   ```

2. **Add verbose output:**

   ```bash
   npm run test -- --reporter=verbose
   ```

3. **Debug in UI:**
   ```bash
   npm run test:ui
   ```

---

## TDD Workflow Integration

This skill supports Test-Driven Development:

1. **Write failing test** → `/run-tests` (expect RED)
2. **Implement feature** → `/run-tests` (expect GREEN)
3. **Refactor** → `/run-tests` (keep GREEN)

---

## Error Handling

| Error              | Action                                              |
| ------------------ | --------------------------------------------------- |
| "vitest not found" | Run `npm install -D vitest @testing-library/react`  |
| "No tests found"   | Check test file patterns (`*.test.ts`, `*.spec.ts`) |
| "Config not found" | Create `vitest.config.ts`                           |
| Test timeout       | Increase timeout or check for unresolved promises   |

---

## Related

- [Testing Rules](../../rules/testing.md) - Testing best practices
- [Run E2E](../run-e2e/SKILL.md) - E2E testing with Playwright
- [Start Task](../start-task/SKILL.md) - Task workflow with testing
