---
name: run-e2e
description: Run end-to-end tests with Playwright. Supports running all tests, specific files, UI mode, and multiple browsers.
---

# Run E2E Tests

## Description

Executes end-to-end tests using Playwright. Tests user flows in real browsers, validates functionality across the full stack, and generates reports with screenshots and traces.

---

## Usage

```
/run-e2e [options] [files]
```

Or natural language:

```
Run E2E tests
Run E2E tests for login
Run E2E tests in UI mode
Run E2E tests on mobile viewport
```

## Parameters

| Parameter          | Required | Description                                              |
| ------------------ | -------- | -------------------------------------------------------- |
| `files`            | No       | Specific test files or patterns (default: all E2E tests) |
| `--ui`             | No       | Open Playwright UI mode for debugging                    |
| `--headed`         | No       | Run tests with visible browser                           |
| `--browser <name>` | No       | Run on specific browser (chromium, firefox, webkit)      |
| `--project <name>` | No       | Run specific project (desktop, mobile, etc.)             |
| `--trace`          | No       | Enable tracing for debugging                             |
| `--debug`          | No       | Run in debug mode with inspector                         |

---

## Prerequisites

### Dev Server Detection

Before running E2E tests, ensure the dev server is running:

```bash
# Check if dev server is running
curl http://localhost:3000 2>/dev/null || echo "Server not running"
```

If server is not running:

```bash
# Start dev server in background
npm run dev &
# Wait for server to be ready
npx wait-on http://localhost:3000
```

---

## Steps

### Step 1: Verify Playwright Installation

```bash
# Check Playwright is installed
npx playwright --version
```

If not installed:

```bash
npm install -D @playwright/test
npx playwright install
```

### Step 2: Check Dev Server

Verify the application is running before tests:

```bash
# Quick health check
curl -s http://localhost:3000 > /dev/null && echo "Server ready"
```

### Step 3: Determine Test Scope

Based on parameters:

| Input      | Command                          |
| ---------- | -------------------------------- |
| No args    | `npx playwright test`            |
| File path  | `npx playwright test {file}`     |
| `--ui`     | `npx playwright test --ui`       |
| `--headed` | `npx playwright test --headed`   |
| `--trace`  | `npx playwright test --trace on` |

### Step 4: Run Tests

Execute the appropriate command:

```bash
# All E2E tests
npm run test:e2e

# Specific file
npm run test:e2e -- e2e/tests/auth/login.spec.ts

# UI mode
npm run test:e2e:ui

# Headed mode
npm run test:e2e -- --headed

# Specific browser
npm run test:e2e -- --project=chromium

# With tracing
npm run test:e2e -- --trace on

# Debug mode
npm run test:e2e -- --debug
```

### Step 5: Analyze Results

Parse test output and provide summary:

```markdown
## E2E Test Results

**Status:** PASS / FAIL
**Total:** X tests
**Passed:** X
**Failed:** X
**Skipped:** X
**Duration:** X.Xs

### Browser Coverage

| Browser  | Tests | Passed | Failed |
| -------- | ----- | ------ | ------ |
| Chromium | 10    | 10     | 0      |
| Firefox  | 10    | 9      | 1      |
| WebKit   | 10    | 10     | 0      |

### Failed Tests (if any)

| Test       | Browser | Error   | Screenshot                 |
| ---------- | ------- | ------- | -------------------------- |
| login flow | Firefox | Timeout | [View](./test-results/...) |
```

### Step 6: Handle Artifacts

If tests fail, artifacts are saved:

```
test-results/
├── login-flow-firefox/
│   ├── screenshot.png
│   ├── trace.zip
│   └── video.webm
└── report.html
```

---

## Test Commands

These commands should be available in `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## Examples

### Example 1: Run All E2E Tests

```
/run-e2e
```

**Output:**

```
Running E2E tests...

Running 15 tests using 4 workers

  ✓ e2e/tests/auth/login.spec.ts:12:5 › should login successfully (2.1s)
  ✓ e2e/tests/auth/login.spec.ts:25:5 › should show error on invalid credentials (1.8s)
  ✓ e2e/tests/auth/logout.spec.ts:10:5 › should logout successfully (1.5s)
  ✓ e2e/tests/dashboard/navigation.spec.ts:8:5 › should navigate to profile (1.2s)
  ...

  15 passed (25.3s)

HTML report generated: playwright-report/index.html
```

### Example 2: Run Specific Test File

```
/run-e2e auth/login
```

**Output:**

```
Running E2E tests matching: auth/login

  ✓ login.spec.ts:12:5 › should login successfully (2.1s)
  ✓ login.spec.ts:25:5 › should show error on invalid credentials (1.8s)
  ✓ login.spec.ts:38:5 › should redirect to dashboard after login (2.3s)

  3 passed (6.2s)
```

### Example 3: UI Mode (Interactive)

```
/run-e2e --ui
```

**Output:**

```
Opening Playwright UI...

Playwright Test UI is running at http://localhost:9323

Use the UI to:
- Run individual tests
- Watch tests in real-time
- View trace and screenshots
- Debug step-by-step

Press Ctrl+C to stop.
```

### Example 4: Debug Mode

```
/run-e2e --debug auth/login
```

**Output:**

```
Starting Playwright in debug mode...

Playwright Inspector opened.

Use the inspector to:
- Step through test actions
- Inspect page elements
- View selector matches
- Generate locators
```

### Example 5: Multiple Browsers

```
/run-e2e --browser firefox
```

**Output:**

```
Running E2E tests on Firefox...

  ✓ All 15 tests passed on Firefox (32.1s)

Note: Run without --browser to test all configured browsers.
```

### Example 6: Mobile Viewport

```
/run-e2e --project mobile
```

**Output:**

```
Running E2E tests with mobile viewport...

Using viewport: 375x667 (iPhone SE)
User-Agent: Mobile Safari

  ✓ 15 tests passed (28.5s)
```

---

## Playwright Configuration

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 30_000 : 120_000,
  },
});
```

---

## Writing E2E Tests

### Test Structure

```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pages/LoginPage";

test.describe("Login Flow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should login successfully", async ({ page }) => {
    await loginPage.login("user@example.com", "password");
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome")).toBeVisible();
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await loginPage.login("invalid@example.com", "wrong");
    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });
});
```

### Page Object Model

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

## Handling Failures

### Common Issues

| Error                        | Cause                | Solution                                 |
| ---------------------------- | -------------------- | ---------------------------------------- |
| Timeout waiting for selector | Element not rendered | Add explicit waits or check conditionals |
| Navigation timeout           | Slow page load       | Increase timeout or optimize page        |
| Element not visible          | Hidden or off-screen | Scroll into view or check visibility     |
| Strict mode violation        | Multiple matches     | Use more specific locator                |

### Debugging Tips

1. **View trace:**

   ```bash
   npx playwright show-trace test-results/*/trace.zip
   ```

2. **Take screenshot:**

   ```typescript
   await page.screenshot({ path: "debug.png" });
   ```

3. **Pause execution:**

   ```typescript
   await page.pause(); // Opens inspector
   ```

4. **Slow motion:**
   ```bash
   npx playwright test --headed --slowMo=1000
   ```

---

## Error Handling

| Error                   | Action                                                          |
| ----------------------- | --------------------------------------------------------------- |
| "playwright not found"  | Run `npm install -D @playwright/test && npx playwright install` |
| "Server not running"    | Start dev server: `npm run dev`                                 |
| "Browser not installed" | Run `npx playwright install`                                    |
| "Permission denied"     | Check file permissions, try with sudo                           |

---

## Related

- [Testing Rules](../../rules/testing.md) - Testing best practices
- [Run Tests](../run-tests/SKILL.md) - Unit testing with Vitest
- [Start Task](../start-task/SKILL.md) - Task workflow with testing
