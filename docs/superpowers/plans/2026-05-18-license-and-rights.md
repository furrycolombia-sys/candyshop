# License & Rights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared `AppFooter` component to the four user-facing apps (`landing`, `store`, `payments`, `auth`) and host Terms of Service + Privacy Policy pages on `landing`, in English and Spanish, with content calibrated to a marketplace-not-merchant platform operated as an individual project.

**Architecture:** One pure-presentational `AppFooter` in `packages/app-components` consuming translated strings as props (per the monorepo's "shared = no i18n" rule). Each of the 4 user-facing apps adds a `footer` i18n namespace and renders the footer at the bottom of its `[locale]/layout.tsx`. Two static pages on `landing` under a new `features/legal/` feature folder, each backed by an i18n `legal.terms` / `legal.privacy` namespace.

**Tech Stack:** Next.js 16 (App Router), React 19, next-intl 4, Tailwind v4, Vitest 4, Playwright 1.59, TypeScript 6.

**Spec:** [`docs/superpowers/specs/2026-05-18-license-and-rights-design.md`](../specs/2026-05-18-license-and-rights-design.md)

---

## File structure

### New files

| Path                                                                      | Responsibility                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/app-components/src/components/AppFooter.tsx`                    | Pure presentational footer. 5 props, no i18n inside.                    |
| `packages/app-components/src/components/AppFooter.test.tsx`               | Unit tests for the footer.                                              |
| `apps/landing/src/features/legal/presentation/pages/TermsPage.tsx`        | Terms-of-Service feature page, pulls copy from `legal.terms` namespace. |
| `apps/landing/src/features/legal/presentation/pages/TermsPage.test.tsx`   | Unit tests for TermsPage.                                               |
| `apps/landing/src/features/legal/presentation/pages/PrivacyPage.tsx`      | Privacy-Policy feature page, pulls copy from `legal.privacy` namespace. |
| `apps/landing/src/features/legal/presentation/pages/PrivacyPage.test.tsx` | Unit tests for PrivacyPage.                                             |
| `apps/landing/src/features/legal/index.ts`                                | Public barrel export.                                                   |
| `apps/landing/src/app/[locale]/legal/terms/page.tsx`                      | Thin Next route file.                                                   |
| `apps/landing/src/app/[locale]/legal/privacy/page.tsx`                    | Thin Next route file.                                                   |
| `apps/landing/e2e/legal-pages.spec.ts`                                    | Playwright e2e covering both legal pages + footer link integration.     |

### Modified files

| Path                                                            | Change                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| `packages/app-components/src/components/index.ts`               | Export `AppFooter` + `AppFooterProps`. |
| `apps/landing/src/app/[locale]/layout.tsx`                      | Render `<AppFooter />` at bottom.      |
| `apps/store/src/app/[locale]/layout.tsx`                        | Render `<AppFooter />` at bottom.      |
| `apps/payments/src/app/[locale]/layout.tsx`                     | Render `<AppFooter />` at bottom.      |
| `apps/auth/src/app/[locale]/layout.tsx`                         | Render `<AppFooter />` at bottom.      |
| `apps/landing/src/shared/infrastructure/i18n/messages/en.json`  | Add `footer` + `legal` namespaces.     |
| `apps/landing/src/shared/infrastructure/i18n/messages/es.json`  | Same.                                  |
| `apps/store/src/shared/infrastructure/i18n/messages/en.json`    | Add `footer` namespace.                |
| `apps/store/src/shared/infrastructure/i18n/messages/es.json`    | Same.                                  |
| `apps/payments/src/shared/infrastructure/i18n/messages/en.json` | Add `footer` namespace.                |
| `apps/payments/src/shared/infrastructure/i18n/messages/es.json` | Same.                                  |
| `apps/auth/src/shared/infrastructure/i18n/messages/en.json`     | Add `footer` namespace.                |
| `apps/auth/src/shared/infrastructure/i18n/messages/es.json`     | Same.                                  |

---

## Phase 1 — AppFooter component (TDD)

### Task 1.1: Tests for AppFooter

**Files:**

- Create: `packages/app-components/src/components/AppFooter.test.tsx`

- [ ] **Step 1: Write the failing tests.**

Write `packages/app-components/src/components/AppFooter.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppFooter } from "./AppFooter";

const defaultProps = {
  copyrightSuffix: "Furrycolombia. All rights reserved.",
  termsLabel: "Terms",
  privacyLabel: "Privacy",
  termsHref: "https://example.com/en/legal/terms",
  privacyHref: "https://example.com/en/legal/privacy",
};

describe("AppFooter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-06-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the current year + copyrightSuffix", () => {
    render(<AppFooter {...defaultProps} />);
    expect(screen.getByTestId("app-footer")).toHaveTextContent(
      "© 2030 Furrycolombia. All rights reserved.",
    );
  });

  it("renders the terms link with passed label and href", () => {
    render(<AppFooter {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Terms" });
    expect(link).toHaveAttribute("href", defaultProps.termsHref);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the privacy link with passed label and href", () => {
    render(<AppFooter {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Privacy" });
    expect(link).toHaveAttribute("href", defaultProps.privacyHref);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("exposes a stable test id", () => {
    render(<AppFooter {...defaultProps} />);
    expect(screen.getByTestId("app-footer")).toBeInTheDocument();
  });

  it("renders the localized labels passed in (not hardcoded English)", () => {
    render(
      <AppFooter
        {...defaultProps}
        copyrightSuffix="Furrycolombia. Todos los derechos reservados."
        termsLabel="Términos"
        privacyLabel="Privacidad"
      />,
    );
    expect(screen.getByTestId("app-footer")).toHaveTextContent(
      "© 2030 Furrycolombia. Todos los derechos reservados.",
    );
    expect(screen.getByRole("link", { name: "Términos" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacidad" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `pnpm --filter @monorepo/app-components test -- AppFooter`
Expected: FAIL — module `./AppFooter` not found.

---

### Task 1.2: Implement AppFooter

**Files:**

- Create: `packages/app-components/src/components/AppFooter.tsx`

- [ ] **Step 1: Implement the component.**

Write `packages/app-components/src/components/AppFooter.tsx`:

```tsx
import { tid } from "shared";

export interface AppFooterProps {
  /** Translated copyright line WITHOUT the year. Year is auto-prepended. */
  copyrightSuffix: string;
  /** Translated label for the Terms link. */
  termsLabel: string;
  /** Translated label for the Privacy link. */
  privacyLabel: string;
  /** Absolute URL to the Terms page on the landing app. */
  termsHref: string;
  /** Absolute URL to the Privacy page on the landing app. */
  privacyHref: string;
}

/**
 * Cross-app footer. Pure presentational — no i18n calls inside.
 * The owning app passes already-translated strings and the URLs to
 * the legal pages on the landing app.
 *
 * Legal links open in a new tab so a user mid-checkout or mid-signup
 * doesn't lose their session/cart context while reading the policies.
 */
export function AppFooter({
  copyrightSuffix,
  termsLabel,
  privacyLabel,
  termsHref,
  privacyHref,
}: AppFooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-auto border-t border-foreground/10 bg-background px-4 py-6 text-xs text-muted-foreground"
      {...tid("app-footer")}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 md:flex-row md:justify-between">
        <span>
          © {year} {copyrightSuffix}
        </span>
        <span className="flex items-center gap-2">
          <a
            href={termsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {termsLabel}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {privacyLabel}
          </a>
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run the tests to verify they pass.**

Run: `pnpm --filter @monorepo/app-components test -- AppFooter`
Expected: 5 tests pass.

- [ ] **Step 3: Commit.**

```bash
git add packages/app-components/src/components/AppFooter.tsx packages/app-components/src/components/AppFooter.test.tsx
git commit -m "feat(app-components): add AppFooter component"
```

---

### Task 1.3: Export from app-components barrel

**Files:**

- Modify: `packages/app-components/src/components/index.ts`

- [ ] **Step 1: Add the export.**

Edit `packages/app-components/src/components/index.ts` — add this line under the other exports (alphabetical-ish ordering matches existing file):

```ts
export { AppFooter, type AppFooterProps } from "./AppFooter";
```

After editing, the file's exports should include (existing lines kept verbatim):

```ts
export {
  AppNavigation,
  type AppId,
  type AppNavigationProps,
} from "./AppNavigation";
export { AppFooter, type AppFooterProps } from "./AppFooter";
export { LocaleSwitcher, type LocaleSwitcherProps } from "./LocaleSwitcher";
export { ThemeToggle } from "./ThemeToggle";
export { ErrorIndicator, type ErrorIndicatorProps } from "./ErrorIndicator";
export { LoadingState } from "./LoadingState";
export { ErrorState } from "./ErrorState";
export { EmptyState } from "./EmptyState";
export { ExportDropdown, type ExportDropdownProps } from "./ExportDropdown";
export { TallyFeedbackButton } from "./TallyFeedbackButton";
export { GlobalErrorFallback } from "./GlobalErrorFallback";
export { RouteErrorFallback } from "./RouteErrorFallback";
```

- [ ] **Step 2: Verify the type-check still passes for app-components.**

Run: `pnpm --filter @monorepo/app-components typecheck`
Expected: no errors.

- [ ] **Step 3: Commit.**

```bash
git add packages/app-components/src/components/index.ts
git commit -m "feat(app-components): export AppFooter from barrel"
```

---

## Phase 2 — i18n: add `footer` namespace to 4 apps

The same two-key payload is added to each app's English and Spanish locale files. Each task touches one app's two files only.

### Task 2.1: Add footer i18n to `landing`

**Files:**

- Modify: `apps/landing/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/landing/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add the `footer` key to `en.json`.**

Open `apps/landing/src/shared/infrastructure/i18n/messages/en.json`. After the last existing top-level key, insert this block before the closing `}`:

```json
  ,"footer": {
    "copyrightSuffix": "Furrycolombia. All rights reserved.",
    "terms": "Terms",
    "privacy": "Privacy"
  }
```

(Make sure JSON commas are valid — append a comma to the previous closing brace if it's not the only key, or use whatever Prettier formats to.)

- [ ] **Step 2: Add the `footer` key to `es.json`.**

Open `apps/landing/src/shared/infrastructure/i18n/messages/es.json`. Add equivalently:

```json
  ,"footer": {
    "copyrightSuffix": "Furrycolombia. Todos los derechos reservados.",
    "terms": "Términos",
    "privacy": "Privacidad"
  }
```

- [ ] **Step 3: Run prettier so the file shape is canonical.**

Run: `pnpm prettier --write apps/landing/src/shared/infrastructure/i18n/messages/en.json apps/landing/src/shared/infrastructure/i18n/messages/es.json`
Expected: both files reformatted (or "already formatted" if you wrote them clean).

- [ ] **Step 4: Verify JSON parity.**

Run: `pnpm lint:env || true; node -e "const en=Object.keys(require('./apps/landing/src/shared/infrastructure/i18n/messages/en.json')); const es=Object.keys(require('./apps/landing/src/shared/infrastructure/i18n/messages/es.json')); console.log('en:', en.length, 'es:', es.length); console.log(en.filter(k=>!es.includes(k)).map(k=>'missing in es: '+k).join('\n')); console.log(es.filter(k=>!en.includes(k)).map(k=>'missing in en: '+k).join('\n'));"`

Expected: top-level key counts equal; no missing-in-other-locale output.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/shared/infrastructure/i18n/messages/en.json apps/landing/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(landing): add footer i18n namespace"
```

---

### Task 2.2: Add footer i18n to `store`

**Files:**

- Modify: `apps/store/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/store/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add `footer` to `en.json` of store.**

Same JSON block as in Task 2.1 Step 1, inserted at the top level of `apps/store/src/shared/infrastructure/i18n/messages/en.json`.

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. All rights reserved.",
  "terms": "Terms",
  "privacy": "Privacy"
}
```

- [ ] **Step 2: Add `footer` to `es.json` of store.**

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. Todos los derechos reservados.",
  "terms": "Términos",
  "privacy": "Privacidad"
}
```

- [ ] **Step 3: Run prettier.**

Run: `pnpm prettier --write apps/store/src/shared/infrastructure/i18n/messages/en.json apps/store/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 4: Commit.**

```bash
git add apps/store/src/shared/infrastructure/i18n/messages/en.json apps/store/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(store): add footer i18n namespace"
```

---

### Task 2.3: Add footer i18n to `payments`

**Files:**

- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/payments/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add `footer` to `en.json` of payments.**

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. All rights reserved.",
  "terms": "Terms",
  "privacy": "Privacy"
}
```

- [ ] **Step 2: Add `footer` to `es.json` of payments.**

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. Todos los derechos reservados.",
  "terms": "Términos",
  "privacy": "Privacidad"
}
```

- [ ] **Step 3: Run prettier.**

Run: `pnpm prettier --write apps/payments/src/shared/infrastructure/i18n/messages/en.json apps/payments/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 4: Commit.**

```bash
git add apps/payments/src/shared/infrastructure/i18n/messages/en.json apps/payments/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(payments): add footer i18n namespace"
```

---

### Task 2.4: Add footer i18n to `auth`

**Files:**

- Modify: `apps/auth/src/shared/infrastructure/i18n/messages/en.json`
- Modify: `apps/auth/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add `footer` to `en.json` of auth.**

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. All rights reserved.",
  "terms": "Terms",
  "privacy": "Privacy"
}
```

- [ ] **Step 2: Add `footer` to `es.json` of auth.**

```json
"footer": {
  "copyrightSuffix": "Furrycolombia. Todos los derechos reservados.",
  "terms": "Términos",
  "privacy": "Privacidad"
}
```

- [ ] **Step 3: Run prettier.**

Run: `pnpm prettier --write apps/auth/src/shared/infrastructure/i18n/messages/en.json apps/auth/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 4: Commit.**

```bash
git add apps/auth/src/shared/infrastructure/i18n/messages/en.json apps/auth/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(auth): add footer i18n namespace"
```

---

## Phase 3 — Render the footer in each of 4 app layouts

Each task touches one app's `[locale]/layout.tsx`. The change shape is identical (modulo existing imports / surrounding JSX).

### Task 3.1: Render footer in `landing`

**Files:**

- Modify: `apps/landing/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Import `AppFooter` and `getTranslations`.**

In `apps/landing/src/app/[locale]/layout.tsx`, find the existing import of `TallyFeedbackButton` from `@monorepo/app-components` and add `AppFooter` to the same import:

```tsx
import { AppFooter, TallyFeedbackButton } from "@monorepo/app-components";
```

If `getTranslations` is not yet imported from `next-intl/server`, add it (most landing layouts already import it for `generateMetadata`).

- [ ] **Step 2: Resolve footer strings + URLs in the server component.**

Inside the `LocaleLayout` async function, immediately after `setRequestLocale(locale)` and the existing data-loading lines, add:

```tsx
const tFooter = await getTranslations({ locale, namespace: "footer" });
const termsHref = `${appUrls.landing}/${locale}/legal/terms`;
const privacyHref = `${appUrls.landing}/${locale}/legal/privacy`;
```

- [ ] **Step 3: Render `<AppFooter />` as the last child of the `flex min-h-screen flex-col` wrapper, BEFORE `<TallyFeedbackButton />`.**

Find the `<div className="flex min-h-screen flex-col">` wrapper. After the existing children (top nav, `<ProtectedRoute>`, etc.) and BEFORE the `<TallyFeedbackButton />` if present, insert:

```tsx
<AppFooter
  copyrightSuffix={tFooter("copyrightSuffix")}
  termsLabel={tFooter("terms")}
  privacyLabel={tFooter("privacy")}
  termsHref={termsHref}
  privacyHref={privacyHref}
/>
```

The final structure should look like:

```tsx
<div className="flex min-h-screen flex-col">
  <AppTopNavigation ... />
  {/* existing protected-route + children block */}
  <AppFooter
    copyrightSuffix={tFooter("copyrightSuffix")}
    termsLabel={tFooter("terms")}
    privacyLabel={tFooter("privacy")}
    termsHref={termsHref}
    privacyHref={privacyHref}
  />
</div>
<TallyFeedbackButton />
```

- [ ] **Step 4: Verify the app builds and types check.**

Run: `pnpm --filter landing typecheck`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/app/[locale]/layout.tsx
git commit -m "feat(landing): render AppFooter in locale layout"
```

---

### Task 3.2: Render footer in `store`

**Files:**

- Modify: `apps/store/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Add `AppFooter` to the `@monorepo/app-components` import.**

In `apps/store/src/app/[locale]/layout.tsx`:

```tsx
import { AppFooter, TallyFeedbackButton } from "@monorepo/app-components";
```

If `getTranslations` is not yet imported, add it to the `next-intl/server` import.

- [ ] **Step 2: Resolve footer strings + URLs.**

Inside the layout's async function, after `setRequestLocale(locale)`:

```tsx
const tFooter = await getTranslations({ locale, namespace: "footer" });
const termsHref = `${appUrls.landing}/${locale}/legal/terms`;
const privacyHref = `${appUrls.landing}/${locale}/legal/privacy`;
```

- [ ] **Step 3: Render `<AppFooter />` as the last child of `<div className="flex min-h-screen flex-col">`, BEFORE `<TallyFeedbackButton />` and any `<CartDrawer />`.**

```tsx
<AppFooter
  copyrightSuffix={tFooter("copyrightSuffix")}
  termsLabel={tFooter("terms")}
  privacyLabel={tFooter("privacy")}
  termsHref={termsHref}
  privacyHref={privacyHref}
/>
```

Insert it directly after the `<ProtectedRoute>` block.

- [ ] **Step 4: Verify the typecheck.**

Run: `pnpm --filter store typecheck`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/store/src/app/[locale]/layout.tsx
git commit -m "feat(store): render AppFooter in locale layout"
```

---

### Task 3.3: Render footer in `payments`

**Files:**

- Modify: `apps/payments/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Add the `AppFooter` import.**

```tsx
import { AppFooter, TallyFeedbackButton } from "@monorepo/app-components";
```

Ensure `getTranslations` is imported from `next-intl/server`.

- [ ] **Step 2: Resolve footer strings + URLs in the layout function.**

```tsx
const tFooter = await getTranslations({ locale, namespace: "footer" });
const termsHref = `${appUrls.landing}/${locale}/legal/terms`;
const privacyHref = `${appUrls.landing}/${locale}/legal/privacy`;
```

- [ ] **Step 3: Render `<AppFooter />` inside the outer wrapper.**

Same JSX block as Task 3.2 Step 3.

- [ ] **Step 4: Verify the typecheck.**

Run: `pnpm --filter payments typecheck`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/payments/src/app/[locale]/layout.tsx
git commit -m "feat(payments): render AppFooter in locale layout"
```

---

### Task 3.4: Render footer in `auth`

**Files:**

- Modify: `apps/auth/src/app/[locale]/layout.tsx`

- [ ] **Step 1: Add the `AppFooter` import.**

```tsx
import { AppFooter, TallyFeedbackButton } from "@monorepo/app-components";
```

Ensure `getTranslations` is imported from `next-intl/server`.

- [ ] **Step 2: Resolve footer strings + URLs in the layout function.**

```tsx
const tFooter = await getTranslations({ locale, namespace: "footer" });
const termsHref = `${appUrls.landing}/${locale}/legal/terms`;
const privacyHref = `${appUrls.landing}/${locale}/legal/privacy`;
```

- [ ] **Step 3: Render `<AppFooter />` inside the outer wrapper.**

Same JSX block.

- [ ] **Step 4: Verify the typecheck.**

Run: `pnpm --filter auth typecheck`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add apps/auth/src/app/[locale]/layout.tsx
git commit -m "feat(auth): render AppFooter in locale layout"
```

---

## Phase 4 — Legal pages on `landing`

### Task 4.1: Add legal i18n content to `landing` — English

**Files:**

- Modify: `apps/landing/src/shared/infrastructure/i18n/messages/en.json`

- [ ] **Step 1: Add the `legal` namespace.**

Open `apps/landing/src/shared/infrastructure/i18n/messages/en.json` and insert this block at the top level:

```json
"legal": {
  "common": {
    "lastUpdated": "Last updated: {date}"
  },
  "terms": {
    "title": "Terms of Service",
    "lastUpdatedDate": "2026-05-18",
    "intro": "These terms describe how you may use Furrycolombia. Furrycolombia is a software tool that records transactions agreed between independent users. We are not a seller, buyer, agent, escrow, or money-handler in any transaction. By using the platform you agree to these terms.",
    "sections": {
      "platformAsTool": {
        "heading": "1. The platform is a tool, not a party",
        "body": "Furrycolombia provides a website and database that lets buyers and sellers record transactions they have agreed to between themselves. We do not sell anything ourselves. We are not a party to any transaction recorded on the platform. We do not guarantee the quality, legality, safety, or delivery of any product or service offered by users on the platform."
      },
      "userResponsibility": {
        "heading": "2. You are responsible for your account and your conduct",
        "body": "You are solely responsible for what you do on the platform. That includes the products or services you list, the content you post (text, images, reviews, messages), how you treat other users, how you fulfil orders, the customer service you provide, the taxes you owe, and your compliance with the laws that apply to you. If you act unlawfully or harm other users, that is your problem, not ours."
      },
      "noMoneyHandling": {
        "heading": "3. We do not handle money",
        "body": "The platform does not collect, hold, transfer, or escrow funds. All payments occur directly between users using the methods they choose (bank transfer, cash on delivery, any other arrangement you and the other user agree on). The platform records that a transaction took place. It does not process the payment."
      },
      "disputeResolution": {
        "heading": "4. Disputes between users",
        "body": "If you have a problem with another user — a product that did not arrive, a payment that was not received, a dispute about quality, anything else — the problem is between you and that user. The platform is not an arbitrator. We may, at our discretion, suspend or terminate accounts that violate these terms or harm other users, but we do not adjudicate disputes between users."
      },
      "ip": {
        "heading": "5. Your content",
        "body": "You keep ownership of what you post (product photos, descriptions, reviews, messages). When you post content on the platform you grant us a non-exclusive, royalty-free license to display that content on the platform so the platform can do its job. You can delete your content at any time."
      },
      "accountTermination": {
        "heading": "6. Account suspension and termination",
        "body": "We may suspend or terminate any account at any time, with or without notice, for any reason consistent with these terms — including abuse, fraud, illegal content, or repeated violation of the platform rules."
      },
      "limitationOfLiability": {
        "heading": "7. The platform is provided \"as is\"",
        "body": "We make no warranty that the platform will be uninterrupted, error-free, or fit for any particular purpose. We are not liable for any loss arising out of your use of the platform or out of any transaction recorded on the platform between you and another user. To the extent permitted by Colombian law, our aggregate liability is limited to a nominal amount."
      },
      "changes": {
        "heading": "8. Changes to these terms",
        "body": "We may change these terms at any time. The \"Last updated\" date at the top of this page reflects the most recent change. If you keep using the platform after a change, you accept the change."
      },
      "governingLaw": {
        "heading": "9. Governing law",
        "body": "These terms are governed by the laws of the Republic of Colombia. Any dispute that cannot be resolved between us will be heard by Colombian courts."
      },
      "contact": {
        "heading": "10. Contact",
        "body": "Questions about these terms: furrycolombia@gmail.com."
      }
    }
  },
  "privacy": {
    "title": "Privacy Policy",
    "lastUpdatedDate": "2026-05-18",
    "intro": "This policy explains what personal data we collect on Furrycolombia, why we collect it, how long we keep it, and how to ask us about it. It applies to anyone who uses the platform.",
    "sections": {
      "controller": {
        "heading": "1. Who is the controller of your data",
        "body": "Furrycolombia is operated as an individual project, not a registered legal entity. For all data-related questions, requests, and complaints, contact: furrycolombia@gmail.com."
      },
      "dataCollected": {
        "heading": "2. What data we collect",
        "body": "We collect: your email address, your display name, your avatar image (if you upload one), your seller payment methods (when you choose to publish them as a seller so buyers can pay you), receipts you upload to prove payment for an order, and your order history. We also keep technical logs (timestamps, IP addresses, error logs) for security and abuse-prevention purposes."
      },
      "purposes": {
        "heading": "3. Why we collect it",
        "body": "We use this data to operate the marketplace: to authenticate you, to show your transactions to the right people, to let buyers and sellers find each other and record what they agreed, and to detect and prevent abuse or fraud. We also use it to respond to your questions or requests."
      },
      "whereStored": {
        "heading": "4. Where it is stored",
        "body": "Application data is stored in Supabase (a managed Postgres database and object storage). Static assets and traffic are routed through Cloudflare. Authentication is delegated to Supabase Auth. We rely on these providers to keep your data secure at rest and in transit."
      },
      "whoSeesIt": {
        "heading": "5. Who can see your data",
        "body": "You. The platform operator (us) for moderation and support. Other users in the contexts you publish to — for example, when you publish a seller payment method, buyers who check out from you can see it; when you upload a receipt for an order, the seller of that order can see it. We do not sell or share your data with third parties for marketing."
      },
      "retention": {
        "heading": "6. How long we keep it",
        "body": "As long as your account is active. After your account is closed, we keep your data for a reasonable period for fraud and audit reasons, then delete it."
      },
      "yourRights": {
        "heading": "7. Your rights under Ley 1581",
        "body": "Under Colombian data-protection law (Ley 1581) you have the right to access your data, correct it, ask us to delete it, withdraw consent for its processing, and file a complaint with the Superintendencia de Industria y Comercio. To exercise any of these rights, email furrycolombia@gmail.com."
      },
      "contact": {
        "heading": "8. Contact",
        "body": "For any privacy-related request or complaint: furrycolombia@gmail.com."
      },
      "changes": {
        "heading": "9. Changes to this policy",
        "body": "We may update this policy. The \"Last updated\" date at the top of this page reflects the most recent change. Material changes will be highlighted on this page."
      }
    }
  }
}
```

- [ ] **Step 2: Run prettier.**

Run: `pnpm prettier --write apps/landing/src/shared/infrastructure/i18n/messages/en.json`

- [ ] **Step 3: Sanity-parse the file.**

Run: `node -e "console.log(Object.keys(require('./apps/landing/src/shared/infrastructure/i18n/messages/en.json').legal))"`
Expected: `[ 'common', 'terms', 'privacy' ]`.

- [ ] **Step 4: Commit.**

```bash
git add apps/landing/src/shared/infrastructure/i18n/messages/en.json
git commit -m "feat(landing): add legal i18n namespace (en)"
```

---

### Task 4.2: Add legal i18n content to `landing` — Spanish

**Files:**

- Modify: `apps/landing/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 1: Add the Spanish `legal` namespace.**

Open `apps/landing/src/shared/infrastructure/i18n/messages/es.json` and insert at the top level:

```json
"legal": {
  "common": {
    "lastUpdated": "Última actualización: {date}"
  },
  "terms": {
    "title": "Términos del servicio",
    "lastUpdatedDate": "2026-05-18",
    "intro": "Estos términos describen cómo puedes usar Furrycolombia. Furrycolombia es una herramienta de software que registra transacciones acordadas entre usuarios independientes. No somos vendedores, compradores, agentes, custodios ni intermediarios de dinero en ninguna transacción. Al usar la plataforma aceptas estos términos.",
    "sections": {
      "platformAsTool": {
        "heading": "1. La plataforma es una herramienta, no una parte",
        "body": "Furrycolombia ofrece un sitio web y una base de datos que permite a compradores y vendedores registrar transacciones que acordaron entre ellos. Nosotros no vendemos nada. No somos parte de ninguna transacción registrada en la plataforma. No garantizamos la calidad, legalidad, seguridad ni entrega de ningún producto o servicio ofrecido por los usuarios."
      },
      "userResponsibility": {
        "heading": "2. Tú eres responsable de tu cuenta y de tu conducta",
        "body": "Tú eres el único responsable de lo que haces en la plataforma: los productos o servicios que publicas, el contenido que subes (texto, imágenes, reseñas, mensajes), cómo tratas a otros usuarios, cómo cumples con tus pedidos, el servicio al cliente que prestas, los impuestos que debes, y el cumplimiento de las leyes que se te aplican. Si actúas de forma ilegal o dañas a otros usuarios, ese es tu problema, no el nuestro."
      },
      "noMoneyHandling": {
        "heading": "3. No manejamos dinero",
        "body": "La plataforma no recauda, custodia, transfiere ni mantiene fondos en garantía. Todos los pagos ocurren directamente entre los usuarios usando los métodos que ellos elijan (transferencia bancaria, pago contra entrega, o cualquier otro arreglo que acuerden). La plataforma registra que una transacción ocurrió. No procesa el pago."
      },
      "disputeResolution": {
        "heading": "4. Disputas entre usuarios",
        "body": "Si tienes un problema con otro usuario — un producto que no llegó, un pago que no se recibió, una disputa sobre calidad, cualquier otra cosa — el problema es entre tú y ese usuario. La plataforma no es árbitro. Podemos, a nuestra discreción, suspender o cancelar cuentas que violen estos términos o dañen a otros usuarios, pero no resolvemos disputas entre usuarios."
      },
      "ip": {
        "heading": "5. Tu contenido",
        "body": "Conservas la propiedad de lo que publicas (fotos de productos, descripciones, reseñas, mensajes). Cuando publicas contenido en la plataforma nos otorgas una licencia no exclusiva y gratuita para mostrar ese contenido en la plataforma, para que la plataforma pueda hacer su trabajo. Puedes eliminar tu contenido en cualquier momento."
      },
      "accountTermination": {
        "heading": "6. Suspensión y cancelación de cuentas",
        "body": "Podemos suspender o cancelar cualquier cuenta en cualquier momento, con o sin previo aviso, por cualquier razón consistente con estos términos — incluyendo abuso, fraude, contenido ilegal, o violación reiterada de las reglas de la plataforma."
      },
      "limitationOfLiability": {
        "heading": "7. La plataforma se ofrece \"tal cual\"",
        "body": "No garantizamos que la plataforma sea ininterrumpida, libre de errores, ni apta para un propósito particular. No somos responsables de pérdidas derivadas del uso que hagas de la plataforma o de cualquier transacción registrada en la plataforma entre tú y otro usuario. En la medida permitida por la ley colombiana, nuestra responsabilidad agregada se limita a un monto nominal."
      },
      "changes": {
        "heading": "8. Cambios a estos términos",
        "body": "Podemos cambiar estos términos en cualquier momento. La fecha de \"Última actualización\" en la parte superior de esta página refleja el cambio más reciente. Si continúas usando la plataforma después de un cambio, aceptas el cambio."
      },
      "governingLaw": {
        "heading": "9. Ley aplicable",
        "body": "Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa que no podamos resolver será conocida por los tribunales colombianos."
      },
      "contact": {
        "heading": "10. Contacto",
        "body": "Preguntas sobre estos términos: furrycolombia@gmail.com."
      }
    }
  },
  "privacy": {
    "title": "Política de privacidad",
    "lastUpdatedDate": "2026-05-18",
    "intro": "Esta política explica qué datos personales recogemos en Furrycolombia, para qué los recogemos, cuánto tiempo los conservamos y cómo contactarnos al respecto. Aplica a cualquier persona que use la plataforma.",
    "sections": {
      "controller": {
        "heading": "1. Quién es el responsable de tus datos",
        "body": "Furrycolombia se opera como un proyecto individual, no como una entidad legal registrada. Para todas las preguntas, solicitudes y reclamos relacionados con tus datos, escribe a: furrycolombia@gmail.com."
      },
      "dataCollected": {
        "heading": "2. Qué datos recogemos",
        "body": "Recogemos: tu dirección de correo, tu nombre de usuario, tu imagen de avatar (si la subes), tus métodos de pago como vendedor (cuando eliges publicarlos para que los compradores puedan pagarte), los comprobantes que subes para demostrar pago de un pedido, y tu historial de pedidos. También guardamos registros técnicos (marcas de tiempo, direcciones IP, errores) para seguridad y prevención de abuso."
      },
      "purposes": {
        "heading": "3. Para qué los recogemos",
        "body": "Usamos estos datos para operar el marketplace: autenticarte, mostrar tus transacciones a las personas correctas, permitir que compradores y vendedores se encuentren y registren lo que acordaron, y detectar y prevenir abusos o fraudes. También los usamos para responder a tus preguntas o solicitudes."
      },
      "whereStored": {
        "heading": "4. Dónde se almacenan",
        "body": "Los datos de la aplicación se almacenan en Supabase (base de datos Postgres administrada y almacenamiento de objetos). Los activos estáticos y el tráfico pasan por Cloudflare. La autenticación se delega a Supabase Auth. Confiamos en estos proveedores para mantener tus datos seguros en reposo y en tránsito."
      },
      "whoSeesIt": {
        "heading": "5. Quién puede ver tus datos",
        "body": "Tú. El operador de la plataforma (nosotros) para moderación y soporte. Otros usuarios en los contextos donde publicas — por ejemplo, cuando publicas un método de pago de vendedor, los compradores que te compren pueden verlo; cuando subes un comprobante para un pedido, el vendedor de ese pedido puede verlo. No vendemos ni compartimos tus datos con terceros con fines de mercadeo."
      },
      "retention": {
        "heading": "6. Cuánto tiempo los conservamos",
        "body": "Mientras tu cuenta esté activa. Después de que cierres tu cuenta, los conservamos por un periodo razonable por motivos de fraude y auditoría, y luego los eliminamos."
      },
      "yourRights": {
        "heading": "7. Tus derechos bajo la Ley 1581",
        "body": "Bajo la ley de protección de datos personales de Colombia (Ley 1581) tienes derecho a acceder a tus datos, corregirlos, pedirnos que los borremos, retirar tu consentimiento al tratamiento, y presentar una queja ante la Superintendencia de Industria y Comercio. Para ejercer cualquiera de estos derechos, escribe a furrycolombia@gmail.com."
      },
      "contact": {
        "heading": "8. Contacto",
        "body": "Para cualquier solicitud o reclamo de privacidad: furrycolombia@gmail.com."
      },
      "changes": {
        "heading": "9. Cambios a esta política",
        "body": "Podemos actualizar esta política. La fecha de \"Última actualización\" en la parte superior de esta página refleja el cambio más reciente. Los cambios materiales se destacarán en esta página."
      }
    }
  }
}
```

- [ ] **Step 2: Run prettier.**

Run: `pnpm prettier --write apps/landing/src/shared/infrastructure/i18n/messages/es.json`

- [ ] **Step 3: Verify both locales have the same key structure.**

Run: `node -e "
const en = require('./apps/landing/src/shared/infrastructure/i18n/messages/en.json').legal;
const es = require('./apps/landing/src/shared/infrastructure/i18n/messages/es.json').legal;
function flatten(obj, prefix='') {
  const out = [];
  for (const [k,v] of Object.entries(obj)) {
    const path = prefix ? prefix+'.'+k : k;
    if (typeof v === 'object' && v !== null) out.push(...flatten(v, path));
    else out.push(path);
  }
  return out.sort();
}
const enKeys = flatten(en), esKeys = flatten(es);
console.log('en keys:', enKeys.length, 'es keys:', esKeys.length);
const onlyEn = enKeys.filter(k => !esKeys.includes(k));
const onlyEs = esKeys.filter(k => !enKeys.includes(k));
if (onlyEn.length) console.log('Missing in es:', onlyEn);
if (onlyEs.length) console.log('Missing in en:', onlyEs);
if (!onlyEn.length && !onlyEs.length) console.log('OK — locales in parity');
"`

Expected: `OK — locales in parity`.

- [ ] **Step 4: Commit.**

```bash
git add apps/landing/src/shared/infrastructure/i18n/messages/es.json
git commit -m "feat(landing): add legal i18n namespace (es)"
```

---

### Task 4.3: TermsPage component (with tests)

**Files:**

- Create: `apps/landing/src/features/legal/presentation/pages/TermsPage.tsx`
- Create: `apps/landing/src/features/legal/presentation/pages/TermsPage.test.tsx`

- [ ] **Step 1: Write the failing test.**

Write `apps/landing/src/features/legal/presentation/pages/TermsPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
      if (values) return `${namespace ?? ""}.${key}:${JSON.stringify(values)}`;
      return `${namespace ?? ""}.${key}`;
    },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { TermsPage } from "./TermsPage";

describe("TermsPage", () => {
  it("renders the legal-terms-page test id", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("legal-terms-page")).toBeInTheDocument();
  });

  it("renders the page title heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a last-updated line", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("legal-last-updated")).toBeInTheDocument();
    expect(screen.getByTestId("legal-last-updated")).not.toBeEmpty();
  });

  it("renders all 10 section headings", () => {
    render(<TermsPage />);
    // h2 per section
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBe(10);
  });
});
```

- [ ] **Step 2: Run the failing test.**

Run: `pnpm --filter landing test -- TermsPage`
Expected: FAIL — module `./TermsPage` not found.

- [ ] **Step 3: Implement `TermsPage.tsx`.**

Write `apps/landing/src/features/legal/presentation/pages/TermsPage.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { tid } from "shared";

const SECTION_KEYS = [
  "platformAsTool",
  "userResponsibility",
  "noMoneyHandling",
  "disputeResolution",
  "ip",
  "accountTermination",
  "limitationOfLiability",
  "changes",
  "governingLaw",
  "contact",
] as const;

export function TermsPage() {
  const t = useTranslations("legal.terms");
  const tCommon = useTranslations("legal.common");
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-12"
      {...tid("legal-terms-page")}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p
          className="mt-2 text-sm text-muted-foreground"
          {...tid("legal-last-updated")}
        >
          {tCommon("lastUpdated", { date: t("lastUpdatedDate") })}
        </p>
      </header>
      <p className="mb-8 leading-relaxed">{t("intro")}</p>
      <div className="flex flex-col gap-6">
        {SECTION_KEYS.map((key) => (
          <section key={key}>
            <h2 className="mb-2 text-xl font-semibold">
              {t(`sections.${key}.heading`)}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {t(`sections.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm --filter landing test -- TermsPage`
Expected: 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/features/legal/presentation/pages/TermsPage.tsx apps/landing/src/features/legal/presentation/pages/TermsPage.test.tsx
git commit -m "feat(landing): add TermsPage feature component"
```

---

### Task 4.4: PrivacyPage component (with tests)

**Files:**

- Create: `apps/landing/src/features/legal/presentation/pages/PrivacyPage.tsx`
- Create: `apps/landing/src/features/legal/presentation/pages/PrivacyPage.test.tsx`

- [ ] **Step 1: Write the failing test.**

Write `apps/landing/src/features/legal/presentation/pages/PrivacyPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) => (key: string, values?: Record<string, unknown>) => {
      if (values) return `${namespace ?? ""}.${key}:${JSON.stringify(values)}`;
      return `${namespace ?? ""}.${key}`;
    },
}));

vi.mock("@/shared/infrastructure/config/tid", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

import { PrivacyPage } from "./PrivacyPage";

describe("PrivacyPage", () => {
  it("renders the legal-privacy-page test id", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("legal-privacy-page")).toBeInTheDocument();
  });

  it("renders the page title heading", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders a last-updated line", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("legal-last-updated")).toBeInTheDocument();
    expect(screen.getByTestId("legal-last-updated")).not.toBeEmpty();
  });

  it("renders all 9 section headings", () => {
    render(<PrivacyPage />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.length).toBe(9);
  });
});
```

- [ ] **Step 2: Run the failing test.**

Run: `pnpm --filter landing test -- PrivacyPage`
Expected: FAIL — module `./PrivacyPage` not found.

- [ ] **Step 3: Implement `PrivacyPage.tsx`.**

Write `apps/landing/src/features/legal/presentation/pages/PrivacyPage.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { tid } from "shared";

const SECTION_KEYS = [
  "controller",
  "dataCollected",
  "purposes",
  "whereStored",
  "whoSeesIt",
  "retention",
  "yourRights",
  "contact",
  "changes",
] as const;

export function PrivacyPage() {
  const t = useTranslations("legal.privacy");
  const tCommon = useTranslations("legal.common");
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-12"
      {...tid("legal-privacy-page")}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p
          className="mt-2 text-sm text-muted-foreground"
          {...tid("legal-last-updated")}
        >
          {tCommon("lastUpdated", { date: t("lastUpdatedDate") })}
        </p>
      </header>
      <p className="mb-8 leading-relaxed">{t("intro")}</p>
      <div className="flex flex-col gap-6">
        {SECTION_KEYS.map((key) => (
          <section key={key}>
            <h2 className="mb-2 text-xl font-semibold">
              {t(`sections.${key}.heading`)}
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {t(`sections.${key}.body`)}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass.**

Run: `pnpm --filter landing test -- PrivacyPage`
Expected: 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/features/legal/presentation/pages/PrivacyPage.tsx apps/landing/src/features/legal/presentation/pages/PrivacyPage.test.tsx
git commit -m "feat(landing): add PrivacyPage feature component"
```

---

### Task 4.5: Feature barrel export

**Files:**

- Create: `apps/landing/src/features/legal/index.ts`

- [ ] **Step 1: Write the barrel.**

Write `apps/landing/src/features/legal/index.ts`:

```ts
export { TermsPage } from "./presentation/pages/TermsPage";
export { PrivacyPage } from "./presentation/pages/PrivacyPage";
```

- [ ] **Step 2: Commit.**

```bash
git add apps/landing/src/features/legal/index.ts
git commit -m "feat(landing): export legal feature pages"
```

---

### Task 4.6: Next route wrappers (`/legal/terms` and `/legal/privacy`)

**Files:**

- Create: `apps/landing/src/app/[locale]/legal/terms/page.tsx`
- Create: `apps/landing/src/app/[locale]/legal/privacy/page.tsx`

- [ ] **Step 1: Write the Terms route wrapper.**

Write `apps/landing/src/app/[locale]/legal/terms/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";

import { TermsPage } from "@/features/legal";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsPage />;
}
```

- [ ] **Step 2: Write the Privacy route wrapper.**

Write `apps/landing/src/app/[locale]/legal/privacy/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";

import { PrivacyPage } from "@/features/legal";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyPage />;
}
```

- [ ] **Step 3: Verify the landing app type-checks.**

Run: `pnpm --filter landing typecheck`
Expected: no errors.

- [ ] **Step 4: Verify the landing app builds the new routes.**

Run: `pnpm --filter landing exec next build --no-lint 2>&1 | grep -E "(legal/terms|legal/privacy|error)"`
Expected: both routes appear in the build output, no errors.

(Skip this step if the dev server is already running locally — it auto-discovers new routes.)

- [ ] **Step 5: Commit.**

```bash
git add apps/landing/src/app/[locale]/legal/terms/page.tsx apps/landing/src/app/[locale]/legal/privacy/page.tsx
git commit -m "feat(landing): add /legal/terms and /legal/privacy route wrappers"
```

---

## Phase 5 — E2E

### Task 5.1: `legal-pages.spec.ts`

**Files:**

- Create: `apps/landing/e2e/legal-pages.spec.ts`

- [ ] **Step 1: Write the spec.**

Write `apps/landing/e2e/legal-pages.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { ELEMENT_TIMEOUT_MS } from "../../auth/e2e/helpers/constants";

function getLandingBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_LANDING_URL;
  if (!url) throw new Error("NEXT_PUBLIC_LANDING_URL is required.");
  return url;
}

test.describe("Legal pages", () => {
  for (const locale of ["en", "es"]) {
    test(`/${locale}/legal/terms renders title, last-updated, and 10 sections`, async ({
      page,
    }) => {
      await page.goto(`${getLandingBaseUrl()}/${locale}/legal/terms`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByTestId("legal-terms-page")).toBeVisible({
        timeout: ELEMENT_TIMEOUT_MS,
      });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.getByTestId("legal-last-updated")).toBeVisible();
      await expect(page.getByTestId("legal-last-updated")).not.toBeEmpty();
      const sectionHeadings = page.locator("h2");
      await expect(sectionHeadings).toHaveCount(10);
    });

    test(`/${locale}/legal/privacy renders title, last-updated, and 9 sections`, async ({
      page,
    }) => {
      await page.goto(`${getLandingBaseUrl()}/${locale}/legal/privacy`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByTestId("legal-privacy-page")).toBeVisible({
        timeout: ELEMENT_TIMEOUT_MS,
      });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h1")).not.toBeEmpty();
      await expect(page.getByTestId("legal-last-updated")).toBeVisible();
      await expect(page.getByTestId("legal-last-updated")).not.toBeEmpty();
      const sectionHeadings = page.locator("h2");
      await expect(sectionHeadings).toHaveCount(9);
    });
  }

  test("footer is visible on the landing home and contains both legal links", async ({
    page,
  }) => {
    await page.goto(`${getLandingBaseUrl()}/en`, { waitUntil: "networkidle" });
    const footer = page.getByTestId("app-footer");
    await expect(footer).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    // Two links inside the footer, with hrefs pointing at /legal/terms and /legal/privacy.
    const termsLink = footer.getByRole("link").first();
    const privacyLink = footer.getByRole("link").last();
    await expect(termsLink).toHaveAttribute("href", /\/legal\/terms$/);
    await expect(privacyLink).toHaveAttribute("href", /\/legal\/privacy$/);
    // Both open in a new tab.
    await expect(termsLink).toHaveAttribute("target", "_blank");
    await expect(privacyLink).toHaveAttribute("target", "_blank");
  });
});
```

- [ ] **Step 2: Run the spec.**

If you have the dev stack running (`pnpm dev`):

Run: `node scripts/e2e.mjs --env dev --app landing -- apps/landing/e2e/legal-pages.spec.ts`

(If the e2e runner does not yet accept `--app landing`, edit `scripts/e2e.mjs` to add `landing` to the allowlist following the same shape as the `payments` entry already there. Port for landing is 5004.)

Expected: 5 tests pass.

- [ ] **Step 3: Commit.**

```bash
git add apps/landing/e2e/legal-pages.spec.ts
git commit -m "test(landing): add e2e for legal pages + footer link integration"
```

---

## Phase 6 — Final verification

### Task 6.1: Full quality gates + cross-app footer smoke test

- [ ] **Step 1: Format check.**

Run: `pnpm format:check`
Expected: clean.

- [ ] **Step 2: Lint.**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Type-check all affected workspaces.**

Run: `pnpm --filter landing --filter store --filter payments --filter auth --filter @monorepo/app-components typecheck`
Expected: all clean.

- [ ] **Step 4: Run all unit tests across affected workspaces.**

Run: `pnpm --filter landing --filter store --filter payments --filter auth --filter @monorepo/app-components test`
Expected: every test file passes; AppFooter has 5 cases, TermsPage 4, PrivacyPage 4.

- [ ] **Step 5: Smoke test the footer on each of the 4 apps manually (dev server).**

In one terminal: `pnpm dev`

Visit each URL and confirm the footer is at the bottom with both legal links:

```
http://localhost:5004/en          ← landing
http://localhost:5001/en          ← store
http://localhost:5005/en/checkout ← payments (a representative route)
http://localhost:5000/en/login    ← auth
```

The Terms and Privacy links should open in a new tab and resolve to the landing app's `/en/legal/terms` and `/en/legal/privacy` routes.

- [ ] **Step 6: Test the locale switch.**

On any of the 4 apps, switch the locale to Spanish via the existing locale switcher. The footer text should change to Spanish (`Términos`, `Privacidad`, `Todos los derechos reservados.`). Clicking either link should land on the Spanish version of the legal page (`/es/legal/...`).

- [ ] **Step 7: Final commit (if Step 5 / Step 6 surfaced any tweaks).**

If no tweaks needed, no commit. If tweaks needed, fix the underlying problem (don't just patch the symptom), commit with a `fix(...)` message.

---

## Self-review

**Spec coverage check** (each spec section → task that implements it):

- §1 Footer component → Tasks 1.1, 1.2, 1.3.
- §2 Apps that render the footer (4 of 7) → Tasks 3.1, 3.2, 3.3, 3.4 (+ i18n in 2.1, 2.2, 2.3, 2.4).
- §3 Legal pages on landing → Tasks 4.1 (en i18n), 4.2 (es i18n), 4.3 (TermsPage), 4.4 (PrivacyPage), 4.5 (barrel), 4.6 (route wrappers).
- §4 Architecture summary → matches the File-structure list at the top of this plan.
- §5 Testing → Tasks 1.1, 4.3, 4.4 (unit); Task 5.1 (e2e); Task 6.1 (manual smoke).
- §6 Failure modes → covered by the i18n parity script in Task 4.2 Step 3 (translation key missing); the `appUrls.landing` guarantee is satisfied by the existing config (no new code needed).
- §7 Out of scope → respected; no cookie banner, no refund page, no AUP, no DMCA, no Aviso Legal, no self-service deletion, no versioning/re-acceptance, no footer on internal apps.
- §8 Open questions → none; all design decisions encoded in the tasks.

**Placeholder scan:** No `TBD` / `TODO` / "implement later" patterns. Every step contains the code or content it produces. Every test shows the expected output. Every commit message is concrete.

**Type / name consistency:**

- `AppFooterProps` consistently named across `AppFooter.tsx`, `AppFooter.test.tsx`, the barrel export, and every layout consumer.
- Test-id values consistent: `app-footer` (footer), `legal-terms-page` (Terms page), `legal-privacy-page` (Privacy page), `legal-last-updated` (date line — shared name across both pages).
- Section key arrays in `TermsPage.tsx` (10 keys) and `PrivacyPage.tsx` (9 keys) match the structure of the i18n payloads in Task 4.1 and Task 4.2.
- Locale-aware URL construction `${appUrls.landing}/${locale}/legal/<page>` consistent in all 4 layout edits.

No gaps found.
