# Design Spec: License & Rights footer + legal pages

**Date:** 2026-05-18
**Status:** Approved
**Scope:** Add a shared footer to the four user-facing apps and host two legal pages (Terms of Service, Privacy Policy) on the `landing` app, in English and Spanish.

---

## Problem

The project currently has **no user-facing legal posture**:

- No copyright notice on any page in any app.
- No Terms of Service — meaning we have no published basis for the platform-as-tool / marketplace-not-merchant relationship, no documented user-accountability stance, no governing-law clause, no account-suspension authority.
- No Privacy Policy — meaning users have no published statement of what data we collect (emails, names, avatars, seller payment methods, receipts, orders), how long we keep it, who sees it, or how to contact us about it. Colombia's Ley 1581 requires this disclosure regardless of business registration status.
- Auth signup pages collect personal data and create accounts without any "by signing up you agree to…" link, because there is nothing to link to.

This spec adds the minimum responsible legal surface for a marketplace platform operated as an individual project — small enough to ship in one pass, real enough to count.

---

## Goals

1. **Disclose:** every user-facing page exposes basic identity (`© Furrycolombia`) and one click to Terms + Privacy.
2. **Establish the marketplace stance:** Terms make it explicit that the platform records transactions agreed to between independent users, does not handle money, and is not a party to any transaction.
3. **Establish the data stance:** Privacy Policy lists every category of personal data the system stores, who can see it, and how to ask about it.
4. **Bilingual:** English and Spanish content for both pages and all UI strings.
5. **Reusable plumbing:** the footer is one shared component used by every app that needs it. New apps pick it up for free.
6. **Don't over-build:** no cookie banner (not legally required for this site's cookie surface), no refund policy (no refunds), no AUP, no DMCA, no versioning/re-acceptance flow.

---

## Non-goals

- A cookie / consent banner. The platform sets only essential cookies (Supabase Auth session, theme preference). Colombia (Ley 1581) requires data-handling notice, which the Privacy Policy provides; it does not require a per-cookie banner. Skipped.
- A refund policy page. The platform does not handle money or process refunds; refunds, if any, are negotiated directly between buyer and seller off-platform. Skipped.
- An Acceptable Use Policy as a separate page. The relevant prohibitions (no illegal content, no abuse, no impersonation) live as clauses inside Terms for v1.
- A DMCA / copyright-takedown process page. Not needed at current scale; can be added later if traffic grows.
- An Aviso Legal page as a separate document. The project operator is an individual without a registered legal entity; the relevant identity disclosure (project name + contact email) sits in the footer and Privacy Policy.
- Self-service account deletion. Out of scope; users contact `furrycolombia@gmail.com` to exercise their Ley 1581 rights for v1.
- A versioning / re-acceptance flow on Terms changes. Out of scope for v1; the page will carry a "Last updated" line edited manually.

---

## Section 1: Footer component

### Where it lives

`packages/app-components/src/components/AppFooter.tsx`

This is the same package that already hosts `AppNavigation`, `LocaleSwitcher`, `TallyFeedbackButton` — established home for cross-app layout primitives.

### Props (i18n-injected, per `monorepo-architecture.md`)

```ts
export interface AppFooterProps {
  /** Translated copyright line *without* the year. Year is auto-appended. */
  copyrightSuffix: string; // e.g. "Furrycolombia. Todos los derechos reservados."
  /** Translated label for the Terms link. */
  termsLabel: string;      // e.g. "Términos"
  /** Translated label for the Privacy link. */
  privacyLabel: string;    // e.g. "Privacidad"
  /** Absolute URL to the Terms page on the landing app. */
  termsHref: string;       // e.g. "https://store.furrycolombia.com/en/legal/terms"
  /** Absolute URL to the Privacy page on the landing app. */
  privacyHref: string;
}
```

The component does no i18n itself. Apps build the strings from their own `next-intl` setup and the URLs from their own `appUrls.landing` config.

### Visual contract

- One line on desktop (`md+`), stacked on mobile.
- Left side: `© {year} {copyrightSuffix}` — year computed once at render time via `new Date().getFullYear()`.
- Right side: two text links, separated by a `·` middle-dot, linking to `termsHref` and `privacyHref`. Links open in a **new tab** (`target="_blank"` + `rel="noopener noreferrer"`) so a user mid-flow (checkout, signup) doesn't lose their context to read a 4-screen Terms doc.
- Sits at the bottom of the page using `<footer>` semantic tag, full-width, separated from the content above by a top border.
- Styling uses the project's semantic color tokens (`text-muted-foreground`, `border-foreground/10`) — no raw palette colors per `tailwind.md`.
- Stable test id: `tid("app-footer")`.

### Why year is computed client-side

Server-rendering the year would bake it into the page at deploy time and go stale on January 1st. `new Date().getFullYear()` in the render function ensures the footer always shows the current calendar year on the client without a redeploy. There is no SEO concern — the footer text is presentational, not content search engines index for relevance.

---

## Section 2: Apps that render the footer

| App           | Footer? | Reason                                                              |
| ------------- | ------- | ------------------------------------------------------------------- |
| `landing`     | ✅      | Public root site                                                    |
| `store`       | ✅      | Buyer-facing storefront                                             |
| `payments`    | ✅      | Buyer + seller transaction surface                                  |
| `auth`        | ✅      | Signup is where Terms/Privacy must be reachable                     |
| `admin`       | ❌      | Internal staff tool                                                 |
| `studio`      | ❌      | Internal seller tool, behind auth                                   |
| `playground`  | ❌      | Internal sandbox                                                    |

For each app in the ✅ set, modify `apps/<app>/src/app/[locale]/layout.tsx`:

1. Add an import for `AppFooter` from `@monorepo/app-components`.
2. Add four new translation keys under a `footer` namespace in `apps/<app>/src/shared/infrastructure/i18n/messages/{en,es}.json`.
3. Render `<AppFooter ... />` as the last child of the outer `flex min-h-screen flex-col` wrapper, so it pins to the bottom of short pages and scrolls naturally on long ones.

### Translation keys per app

```json
{
  "footer": {
    "copyrightSuffix": "Furrycolombia. All rights reserved.",
    "terms": "Terms",
    "privacy": "Privacy"
  }
}
```

Spanish:

```json
{
  "footer": {
    "copyrightSuffix": "Furrycolombia. Todos los derechos reservados.",
    "terms": "Términos",
    "privacy": "Privacidad"
  }
}
```

The four apps in the ✅ set each carry their own `footer` namespace (per the project's "packages have no i18n; apps own their translations" rule). Strings are identical across apps to keep the footer visually identical — but each app's i18n file is the source of truth for that app.

### URL construction in each app

The Terms/Privacy hrefs are computed in the layout from the app's existing `appUrls.landing` config + the current locale:

```ts
const termsHref = `${appUrls.landing}/${locale}/legal/terms`;
const privacyHref = `${appUrls.landing}/${locale}/legal/privacy`;
```

`appUrls.landing` is already in each app's `shared/infrastructure/config` and resolves correctly per environment (dev/staging/prod).

---

## Section 3: Legal pages on `landing`

Two pages, each a single MDX-less Next.js page rendering long-form translated copy.

### Routes

- `apps/landing/src/app/[locale]/legal/terms/page.tsx`
- `apps/landing/src/app/[locale]/legal/privacy/page.tsx`

Both use `landing`'s existing locale routing.

### Page structure (both pages)

A thin page that imports a feature component:

```tsx
// app/[locale]/legal/terms/page.tsx
import { TermsPage } from "@/features/legal/presentation/pages/TermsPage";
export default function Page() { return <TermsPage />; }
```

With the feature component at:

- `apps/landing/src/features/legal/presentation/pages/TermsPage.tsx`
- `apps/landing/src/features/legal/presentation/pages/PrivacyPage.tsx`

Each component uses `useTranslations("legal.terms")` / `useTranslations("legal.privacy")` to pull the long-form copy keyed in `apps/landing/src/shared/infrastructure/i18n/messages/{en,es}.json`.

The page layout is content-first: a centered `max-w-3xl` column on a neutral background, with the rendered legal text and a "Last updated: 2026-05-18" line at the top. The footer (from Section 1) renders below.

### Why feature-folder structure for two static pages

Matches `.claude/rules/architecture.md` — every feature has `domain/`, `application/`, `infrastructure/`, `presentation/`. Static pages still go through `features/<name>/presentation/pages/`. A future change (adding an Acceptable Use Policy, a Cookie Policy, etc.) reuses the same feature folder.

### i18n key structure

```json
{
  "legal": {
    "common": {
      "lastUpdated": "Last updated: {date}"
    },
    "terms": {
      "title": "Terms of Service",
      "intro": "...",
      "sections": {
        "platformAsTool": { "heading": "...", "body": "..." },
        "userResponsibility": { "heading": "...", "body": "..." },
        "noMoneyHandling": { "heading": "...", "body": "..." },
        "disputeResolution": { "heading": "...", "body": "..." },
        "ip": { "heading": "...", "body": "..." },
        "accountTermination": { "heading": "...", "body": "..." },
        "limitationOfLiability": { "heading": "...", "body": "..." },
        "changes": { "heading": "...", "body": "..." },
        "governingLaw": { "heading": "...", "body": "..." }
      }
    },
    "privacy": {
      "title": "Privacy Policy",
      "intro": "...",
      "sections": {
        "controller": { "heading": "...", "body": "..." },
        "dataCollected": { "heading": "...", "body": "..." },
        "purposes": { "heading": "...", "body": "..." },
        "whereStored": { "heading": "...", "body": "..." },
        "whoSeesIt": { "heading": "...", "body": "..." },
        "retention": { "heading": "...", "body": "..." },
        "yourRights": { "heading": "...", "body": "..." },
        "contact": { "heading": "...", "body": "..." },
        "changes": { "heading": "...", "body": "..." }
      }
    }
  }
}
```

Same structure in both `en.json` and `es.json`.

### Content theses (Terms of Service)

The implementation will draft full prose for each section based on these theses. All sections are written from the stance: *individual operator, marketplace-only, no money handling, user accountability.*

| Section                         | Thesis                                                                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform as tool**            | "Furrycolombia" is a software tool that records transactions agreed between independent users. The operator is not a seller, buyer, agent, escrow, or money-handler in any transaction recorded on the platform.                                                          |
| **User responsibility**         | Each user is solely responsible for their account, their content, their conduct, their deliveries, their customer service, their taxes, and their compliance with applicable law.                                                                                          |
| **No money handling**           | The platform does not collect, hold, transfer, or escrow funds. All payments occur directly between users via methods they agree on. The platform records the existence of a transaction; it does not process the payment.                                                |
| **Dispute resolution**          | Disputes between buyers and sellers are between those parties. The platform may, at its discretion, suspend or terminate accounts for violations of these Terms but does not adjudicate disputes between users.                                                            |
| **IP**                          | Users retain rights to content they post (product images, descriptions, reviews, etc.) and grant the platform a non-exclusive license to display that content on the platform for the purpose of operating the marketplace.                                                |
| **Account termination**         | The platform may suspend or terminate any account at any time for cause (abuse, fraud, illegal content) or for any other reason consistent with these Terms.                                                                                                               |
| **Limitation of liability**     | The platform is provided "as is" without warranty. The operator is not liable for transactions, goods, services, or conduct between users. To the extent permitted by Colombian law, the operator's aggregate liability is limited to nominal amounts.                    |
| **Changes**                     | These Terms may change at any time. The "Last updated" date reflects the most recent change. Continued use of the platform after a change constitutes acceptance.                                                                                                          |
| **Governing law**               | Colombian law. Disputes are heard in Colombian courts.                                                                                                                                                                                                                       |

### Content theses (Privacy Policy)

| Section            | Thesis                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Controller**     | The data controller is the project operator. Contact: `furrycolombia@gmail.com`. (Project is operated as an individual, not a registered legal entity.)                                                                                                                                                                                       |
| **Data collected** | Email, display name, avatar image (if uploaded), seller payment-method details (when a user chooses to publish them as a seller), receipts (uploaded by buyers to prove payment for an order), orders and order history.                                                                                                                       |
| **Purposes**       | To operate the marketplace, authenticate users, show the right users the right transactions, support fraud/abuse moderation, and respond to user requests.                                                                                                                                                                                    |
| **Where stored**   | Application data in Supabase (managed Postgres + Storage). Edge caching via Cloudflare. Authentication is delegated to Supabase Auth.                                                                                                                                                                                                          |
| **Who sees it**    | The user themselves; other users in the contexts they publish to (e.g., seller payment methods are visible to buyers checking out from that seller; receipts are visible to the receiving seller and that seller's delegates); platform admins for moderation. No third-party sharing for marketing.                                          |
| **Retention**      | As long as the user's account is active. After account closure, data is retained for a reasonable period for fraud/audit purposes, then deleted.                                                                                                                                                                                              |
| **Your rights**    | Under Ley 1581 (Colombia): access, correction, deletion, withdrawal of consent, complaint. Exercise any of these by emailing `furrycolombia@gmail.com`.                                                                                                                                                                                       |
| **Contact**        | All data-related requests, complaints, or questions: `furrycolombia@gmail.com`.                                                                                                                                                                                                                                                                |
| **Changes**        | This policy may change. The "Last updated" date reflects the most recent change. Material changes will be communicated via a notice on the policy page.                                                                                                                                                                                       |

---

## Section 4: Architecture summary

```
packages/app-components/src/components/
  └── AppFooter.tsx                       [NEW]  Pure component, takes 5 props.

apps/landing/
  ├── src/app/[locale]/legal/terms/page.tsx       [NEW]  Thin wrapper.
  ├── src/app/[locale]/legal/privacy/page.tsx     [NEW]  Thin wrapper.
  ├── src/features/legal/
  │   ├── presentation/pages/TermsPage.tsx        [NEW]  Renders Terms i18n copy.
  │   └── presentation/pages/PrivacyPage.tsx      [NEW]  Renders Privacy i18n copy.
  ├── src/app/[locale]/layout.tsx                 [MOD]  Render <AppFooter ... />.
  └── src/shared/infrastructure/i18n/messages/{en,es}.json  [MOD]  Add footer + legal namespaces.

apps/store/    src/app/[locale]/layout.tsx        [MOD]  Render <AppFooter ... />.
apps/store/    src/shared/.../i18n/messages/{en,es}.json   [MOD]  Add footer namespace.

apps/payments/ src/app/[locale]/layout.tsx        [MOD]  Render <AppFooter ... />.
apps/payments/ src/shared/.../i18n/messages/{en,es}.json   [MOD]  Add footer namespace.

apps/auth/     src/app/[locale]/layout.tsx        [MOD]  Render <AppFooter ... />.
apps/auth/     src/shared/.../i18n/messages/{en,es}.json   [MOD]  Add footer namespace.
```

No backend changes. No DB migrations. No new dependencies.

### Per-app layout change shape (illustrative)

```diff
   <div className="flex min-h-screen flex-col">
     <AppTopNavigation ... />
     <ProtectedRoute locale={locale}>
       <div className="flex flex-1">{children}</div>
     </ProtectedRoute>
+    <AppFooter
+      copyrightSuffix={t("footer.copyrightSuffix")}
+      termsLabel={t("footer.terms")}
+      privacyLabel={t("footer.privacy")}
+      termsHref={`${appUrls.landing}/${locale}/legal/terms`}
+      privacyHref={`${appUrls.landing}/${locale}/legal/privacy`}
+    />
   </div>
```

---

## Section 5: Testing

### Unit

- `AppFooter.test.tsx` (in `packages/app-components/src/components/`):
  - Renders the current year. Test uses `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2030-06-01"))` to pin the date, then asserts the rendered text contains `2030`.
  - Renders all three string props (`copyrightSuffix`, `termsLabel`, `privacyLabel`).
  - Both link `href`s match the passed `termsHref` / `privacyHref` props.
  - Both links carry `rel="noopener noreferrer"` (defensive default — they may be cross-origin in practice depending on environment).
  - Both links have `target="_blank"` so legal pages open in a new tab and don't disrupt the user's session/cart context.
  - Has the `data-testid="app-footer"`.

- `TermsPage.test.tsx` / `PrivacyPage.test.tsx` (in `apps/landing/...`):
  - Renders the title, intro, and every section heading.
  - Renders a "Last updated:" line with a date.
  - Smoke test that no translation key is missing (use the same vitest pattern as the existing pages — render with the i18n provider, fail on missing key).

### E2E (Playwright)

One new spec — `apps/landing/e2e/legal-pages.spec.ts`:

- `/en/legal/terms` renders, has a visible `<h1>`, body text is non-empty.
- `/es/legal/terms` renders, ditto.
- `/en/legal/privacy` renders, ditto.
- `/es/legal/privacy` renders, ditto.
- The footer is visible on `/en` (landing home) and contains both legal links.
- Clicking the Terms link from landing navigates to `/en/legal/terms` and renders.

Per `.claude/rules/e2e-selectors.md`: assertions use `getByTestId("app-footer")` and role-based locators for links; no text assertions on translated copy.

### Integration check

For each of the 4 apps that gets the footer, verify after the build:

- The footer is in the DOM on at least one route (landing `/`, store `/`, payments `/checkout`, auth `/login`).
- Both legal links render and point to the correct landing-app URL.

This is a one-line per-app smoke test included in the existing e2e spec for each app, not a new spec per app.

---

## Section 6: Failure modes

| Failure                                               | Behavior                                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appUrls.landing` not configured in an env            | Footer renders with an empty href on its links. Caught by the layout-level guard already present for other `appUrls` usages (existing code throws on missing config).               |
| Translation key missing in an app's i18n              | next-intl logs a warning and renders the key path. Pre-merge i18n parity check (existing `lint:env`-style script) catches this if extended; otherwise tests catch the missing key. |
| User navigates to `/legal/terms` on the wrong app     | The page is hosted only on `landing`; on other apps that route does not exist and Next returns 404. The footer always points to the landing URL, so this only happens if a user types or follows a non-footer link to `<store>/legal/terms`. Acceptable. |
| User on a localized route hits the footer link        | The locale segment in the URL is constructed from the current locale, so the user lands on the matching language of the legal page.                                                |

---

## Section 7: Out of scope (explicit)

These items were considered and intentionally excluded from v1. Each has a one-line rationale so a future spec author doesn't need to re-relitigate:

| Item                              | Why skipped                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cookie / consent banner           | The site sets only essential cookies (auth, theme). Colombia (Ley 1581) requires data-handling notice via Privacy Policy, not a per-cookie banner.                       |
| Refund policy page                | The platform does not handle money; refunds, if any, occur off-platform between users. No surface to document.                                                           |
| Acceptable Use Policy (separate page) | Relevant prohibitions are covered as clauses inside Terms. Promote to a separate page if/when user base grows.                                                       |
| DMCA / copyright-takedown process | No documented infringement reports at current scale. Add when needed.                                                                                                    |
| Aviso Legal (separate page)       | Operator is an individual without a registered legal entity; footer identity disclosure + Privacy Policy contact are sufficient for the current scale.                   |
| Self-service account deletion     | Users contact `furrycolombia@gmail.com` to exercise Ley 1581 rights in v1. A self-service flow is a future feature.                                                      |
| Versioning + re-acceptance flow   | "Last updated" date on each page is sufficient signal. Re-acceptance flow is overkill at current scale.                                                                  |
| Footer on internal apps           | `admin`, `studio`, `playground` have no anonymous users; legal links there serve no purpose.                                                                             |

---

## Section 8: Open questions

None. All design decisions are made:

- Footer on **4 of 7** apps.
- 2 legal pages on **landing only**.
- Copyright text: **`© <year> Furrycolombia. All rights reserved.`** (or Spanish equivalent). No legal-entity suffix; project is operated as an individual.
- Contact for data requests: **`furrycolombia@gmail.com`**.
- Governing law: **Colombia**.
- Content for both pages **drafted by the implementation** (en + es), reviewed by the user before merge.
