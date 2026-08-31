# Quality Gates

> What the automated checks actually verify, which ones are staged, and the
> gates that were found not to work.

This document exists because of a recurring defect found across this codebase:
**checks that exist, report green, and structurally cannot detect the thing
they are named after.** A gate nobody has tried to make fail is not yet a gate.

---

## The rule

When you add or promote a check, prove it can fail. Write the violation,
watch the check reject it, then delete the violation. Record here what you
proved.

---

## TypeScript

`noUncheckedIndexedAccess` is set in `tsconfig.base.json`, so every workspace
inherits it and a new workspace gets it without opting in.

It was enabled workspace by workspace and found real defects, not just noise:

| Defect                                                                                                                                   | Where                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A `finally` block whose `return` discarded any in-flight exception                                                                       | store cart context                                              |
| The same drag-reorder `splice` bug three times: the removed element was inserted back without checking it existed                        | studio product table, payments display and form section editors |
| Four state updaters that would write `{ ...undefined, ...partial }` — a record missing every required field — when handed a stale index  | admin template editor                                           |
| `email.split("@")[0]` used as a display name, which is only non-empty for a well-formed address                                          | four call sites across store and admin                          |
| `PERMISSION_TEMPLATES` annotated `Record<string, string[]>`, which erased its literal keys and collapsed `TemplateKey` to plain `string` | admin user permissions                                          |

---

## ESLint — Playwright rules

The `eslint-plugin-playwright` recommended set applies to `apps/*/e2e/**`.
Before this was configured the plugin matched only `apps/*/src`, so 26 spec
files had no rules applied at all.

`playwright/expect-expect` is an **error**, not a warning. A test that asserts
nothing passes no matter how the product behaves, which makes it the one
defect a test suite cannot detect on its own.

Making it truthful took configuration. It reported 11 violations and **all 11
were false**: three were Playwright setup/teardown projects that use `test()`
for fixture work, and eight were tests whose assertions live in a helper the
rule cannot see through. Every helper listed in `assertFunctionNames` was
checked to contain real assertions. A rule with no true positives is noise
that trains people to ignore it — and would hide the first real case.

Proved it fires: an assertion-free spec is rejected as an error, and the same
file named `*.setup.ts` is correctly exempt.

Six rules have now been driven to zero and promoted to error:

| Rule                                | Sites                     | What it catches                                                                              |
| ----------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `expect-expect`                     | 0 real                    | a test that asserts nothing                                                                  |
| `no-conditional-expect`             | 5                         | an assertion that may never run                                                              |
| `no-force-option`                   | 4                         | a click that skips actionability -- it passed even if a real buyer could not open their cart |
| `no-useless-not`                    | 25                        | `not.toBeVisible()` where `toBeHidden()` says it positively                                  |
| `prefer-web-first-assertions`       | 15, all exempted in place | `expect(await x.isVisible()).toBe(true)` instead of a retrying assertion                     |
| `consistent-spacing-between-blocks` | 1                         | formatting                                                                                   |

Two of those needed care.

**Promoting a rule needs an explicit `"error"`.** The recommended set ships
several as warnings, so removing one from the staged list leaves it a warning
and the promotion silently does nothing. That was caught only by planting a
violation and watching it fail to error -- which is the whole reason this
document asks you to prove a gate can fail.

**`prefer-web-first-assertions` is armed but exempted 15 times.** Every hit in
this suite compares a value captured earlier against one captured later --
"this block's testid now equals the one that block had before the drag" --
which `toHaveAttribute` cannot express. Each site carries an
`eslint-disable-next-line` with that reason, rather than the rule being turned
off, so the genuine pattern is still caught. This is the rule whose `--fix`
rewrote `const href = await link.getAttribute("href")` into
`const href = link`.

`no-conditional-in-test` was promoted the same way, and found three tests that
could not fail for the thing they were named after:

- `smoke-all-apps` "all apps load": an unreachable app was logged and
  `continue`d, so with every app down the test still passed.
- `smoke-all-apps` "all apps load **without errors**": page errors were
  collected and then only `console.log`ged. It passed while an app threw on
  load -- the single thing it exists to catch.
- `product-detail-seller-card`: a bare `test.skip()` when the fixture data was
  missing, which reported nothing. It is now an annotated skip that says what
  went unverified.

Its remaining sites are exempted where a conditional is honest: Playwright
setup/teardown projects (fixture work is branchy by nature), the manual-only
OAuth harnesses (a hosted sign-in shows different screens by session state),
and idempotent form setup inside a serial flow.

Two rules remain staged as warnings with their counts recorded in
`eslint.config.mjs` -- `no-networkidle` (117), `no-wait-for-timeout` (93),
`no-conditional-in-test` (26) and `no-skipped-test` (5). Each needs per-site
judgement about what to wait for instead, so they are driven to zero one at a
time. Do not run `eslint --fix` blindly over them: `prefer-web-first-assertions` rewrote
`const href = await link.getAttribute("href")` into `const href = link`,
silently turning a string into a Locator and breaking three assertions below
it. Typecheck caught it. Review every hunk.

---

## Known gaps

### An E2E test that disables itself

`apps/store/e2e/product-detail-seller-card.spec.ts` reads:

```ts
const supabase = await getSupabaseAdmin();
if (!supabase) return test.skip();
const { data: product } = await supabase.from("products")…;
if (!product) return test.skip();
```

Both branches turn a missing precondition into a skip. If the E2E database
holds no product with a `seller_id`, the seller-card assertion never runs and
the suite still reports green.

The durable fix is for the test to seed its own product instead of querying
for one that may not exist. That needs a store-side seeding helper — the auth
suite's `createProduct` drives the studio UI and is not reusable here.

### Permanently skipped OAuth tests

`discord-login.spec.ts` and `google-login.spec.ts` call `test.skip(true, …)`
unconditionally. The reason is real: both providers block automated browsers
and the tests need a pre-seeded profile. They are manual-only by design, but
they are also coverage the suite does not have — treat the OAuth paths as
untested by CI.

---

## knip

`knip` is configured but **not yet enforced in CI**: it still reports 202
unused exports and 46 unused exported types, which need triage rather than
configuration.

Its _file_ report is now truthful — it went from 28 unused files to 0, and
only four of the 28 were real:

| Was reported                                                         | Why it was wrong                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 7x `shared/infrastructure/i18n/request.ts`                           | next-intl loads these by config path, never by import                                              |
| 7x `.claude/tools/*.mjs`                                             | MCP servers launched by `.mcp.json` as `node <path>`                                               |
| `docker/*.mjs`, `scripts/**/*.mjs`, `docker/ci/playwright.config.ts` | executed by Docker and by hand, never imported                                                     |
| 4 feature barrels                                                    | mandated by the architecture rule — see below                                                      |
| `apps/studio`, `packages/app-components`, `packages/auth`            | were missing from `knip.json` entirely, so their files were judged against the wrong project graph |

Four files were genuinely dead and are deleted:

- `HomeSections.tsx` and `SocialIcons.tsx` were pure re-export barrels created
  only to satisfy a past naming review that flagged "test file has no matching
  source file". Nothing ever imported them; the tests import the real
  components directly. Both had passing tests, so coverage looked healthy for
  files no product code used.
- `packages/api/src/supabase/client.ts` — an anon-key browser client superseded
  by `browser.ts` and exported from nowhere.
- `vitest.aliases.ts` — a shared-alias helper none of the seven
  `vitest.config.mts` files ever adopted.

### Open question: the feature barrel rule

`.claude/rules/architecture.md` says every feature MUST have an `index.ts`
exporting its public API. Its own import examples then show deep absolute
paths (`@/features/dashboard/domain/types`), and the codebase follows the
examples: across the four barrels knip flagged, there are **126 deep imports
against 6 barrel imports**.

So the barrels are required to exist and are bypassed in practice. They are
marked as knip entry points here because the rule mandates them — but the rule
is inconsistent with itself, and someone should decide whether to enforce
barrel-only imports or drop the requirement. Marking them as entry points also
means their exports count as used, which slightly weakens the unused-export
analysis; that is the cost of agreeing with the rule as written.

---

## The pre-commit hook blocks on errors, not warnings

`lint-staged` used to run `eslint --no-warn-ignored --max-warnings=0` over
staged files. That directly contradicts the staging strategy above: rules are
deliberately left as warnings so they can be driven to zero one at a time, and
a hook that rejects every warning in a touched file makes those files
uneditable.

The practical effect was worse than it sounds. The only way to commit a change
to an E2E spec was `--no-verify`, which skips **Secretlint and the Prettier
check as well**. A gate strict enough to be routinely bypassed protects less
than a gate that runs.

The hook now blocks on errors — which include every promoted rule and the
whole recommended set — while warnings stay visible in `pnpm lint` and in CI's
Quality Checks job, which has always allowed them.

---

## cspell

Now enforced in CI's repo-hygiene step. It reported 70 issues across 36 files;
**one was a real typo** — a test named `"checks granted permissions and leaves
ungrated ones unchecked"`. The rest were vocabulary the config did not know.

Adding the `en-GB` dictionary cleared the British spellings (`serialised`,
`normalises`, `initialises`, `unrecognised`) that a US-only dictionary rejects.

**The Spanish dictionary was tried and rejected.** This app is bilingual and
`cspell.json` hand-maintains a Spanish word list, which does not scale — every
new Spanish string in a component or test trips it. So `@cspell/dict-es-es`
looked like the right fix. It is not: with it enabled, issues went from 70 to
**396**. The remaining Spanish terms are in the word list instead, and the
dependency was removed again.

Proved the gate fires: a comment reading `// intentionaly mispeled coment`
produces three errors, two with suggested corrections.

## Not attempted: the two timing rules

`no-networkidle` (117) and `no-wait-for-timeout` (93) are the largest staged
rules and the main flakiness source. Their shape was measured so whoever picks
them up does not have to:

| Shape                                                                       | Count |
| --------------------------------------------------------------------------- | ----- |
| `goto(…, { waitUntil: "networkidle" })` with an assertion immediately after | 70    |
| `goto` with no immediate assertion                                          | 23    |
| `waitForLoadState("networkidle")` with an assertion after                   | 11    |
| `waitForLoadState` with no assertion                                        | 13    |

The first group is the safe one: the following web-first assertion already
retries, so the `waitUntil` can simply go.

They were deliberately **not** changed in bulk. The E2E suite cannot be run
locally — it needs a live Supabase and the `auth.setup.ts` session artifact —
and the failure mode for wait-condition changes is _intermittent_ flakiness,
which one green CI run does not disprove. Rewriting 70 wait conditions on the
strength of a single pipeline would trade a visible problem for an invisible
one. Do these per app, with someone able to run the suite repeatedly.

---

## jscpd

Configured, and still **not enforced in CI**, but its number is now honest.

It reported 7.75% duplication against a 5% threshold. A chunk of that was the
framework, not the codebase: Next.js requires `layout.tsx`, `error.tsx`,
`global-error.tsx`, `not-found.tsx`, `loading.tsx` and `template.tsx` to exist
as real files at specific paths in every app. Seven apps means seven
near-identical copies of each, and they cannot be deduplicated -- the shared
part is already extracted (`GlobalErrorFallback` lives in
`packages/app-components`; what remains is the `"use client"` directive, a
Sentry `useEffect`, and a default export). Measuring those as duplication
measures Next.js.

Excluding them takes the figure from **7.75% to 6%**.

The remaining 6% is real, and is concentrated in four places:

| Where                                                                                                                  | Clones | What it is                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| `studio` `SectionItems{Accordion,Cards,Gallery,TwoColumn}.tsx`                                                         | 21     | four renderers of the same section data in different layouts |
| `admin` / `payments` report UI (`ReportTable`, `ReportFiltersBar`, `SellerReportFiltersBar`)                           | 10     | two apps with near-identical report screens                  |
| `admin` / `payments` Excel export (`exportOrdersToExcel`, `exportDelegatedOrdersToExcel`, `exportSellerOrdersToExcel`) | 8      | the same worksheet-building code three times                 |
| `packages/ui` (`status-card`, `mini-area-chart`)                                                                       | 4      | variant components                                           |

Driving this under 5% needs component-extraction decisions that are product
calls, not mechanical cleanup -- whether admin's and payments' report screens
_should_ share a component, or are expected to diverge. This repo's own rules
say to favour KISS over DRY and to treat coincidental duplication as something
to leave alone, so the extraction should be a deliberate choice by someone who
knows where those screens are heading.

The Excel exporters are the strongest candidate: three copies of worksheet
construction is knowledge duplication, not coincidence.

---

## CI's change filter had holes

`ci.yml` skips the quality, unit-test, build and E2E jobs for docs-only PRs,
decided by a path filter. The filter listed some tool configs and not others,
so a change to an unlisted one was treated as documentation and went
completely unverified.

This was found the way these things should be: the PR that edited
`.jscpd.json` had every check skipped.

Added to the filter: `.jscpd.json`, `.secretlintrc.*`, `.secretlintignore`,
`.syncpackrc.*`, `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `orval.config.*`,
`.prettierrc*`, `.prettierignore`, `.gitattributes`, `.env.ci`, `.husky/**`
and `config/**`.

Two of those matter beyond tidiness. `pnpm-workspace.yaml` defines which
workspaces exist, so adding or removing one would have skipped CI entirely.
`.secretlintrc.*` and `.secretlintignore` configure secret scanning: weakening
them was a docs-only change.

If you add a root-level config file, add it to **both** the `tooling` and
`code` filters in `.github/workflows/ci.yml`. A config that changes behaviour
but not the filter is invisible to CI.

---

## Accessibility

`.claude/rules/testing.md` documented an accessibility testing section, and
`build-checks.md` listed an `accessibility` job in `pr-checks.yml`. Neither
existed: no axe dependency, no a11y test file, no such job. Both documents now
describe what is actually there.

What is actually there: `vitest-axe` runs over the shared components in
`packages/ui` and `packages/app-components`. Those suites are part of the
normal unit-test run, so CI enforces them through **Unit Tests** — there is no
separate job to forget to add.

It found real defects on its first run:

| Component          | Defect                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProgressBar`      | `role="progressbar"` with `aria-valuenow/min/max` and **no accessible name** — a screen reader announced "42%" with no indication of what was progressing (WCAG 4.1.2) |
| `CircularProgress` | **no role at all** — visually a progress indicator, invisible to assistive technology, and with nothing for a checker to find fault with                               |

Both now require an accessible name _in their type_ — exactly one of
`aria-label` or `aria-labelledby`, via `RequiredAccessibleName`. That turns it
into a compile error rather than something to remember, and it immediately
stopped 23 existing renders from compiling.

Use the same type for any new component that declares a value-carrying role
(`progressbar`, `meter`, `slider`).

Both suites include a test that deliberately fails — an unlabelled `<Input>`,
an icon-only `<button>` — so a suite of green assertions cannot quietly stop
checking anything.

### Page level

`@axe-core/playwright` now runs against `landing`'s public routes — home,
terms, privacy — at WCAG 2.1 AA, plus a dark-mode contrast check. Those routes
need no session and no seeded data, so a failure is about the page and nothing
else.

This is a different check from the component suites, not a bigger one. axe
over a rendered component tree cannot see colour contrast computed against the
real theme, focus order across a whole document, or a heading hierarchy that
only exists once a layout composes.

Still to do: the same treatment for the authenticated apps, which need a
session fixture first.

**Both layers earned their place immediately, and on different defects.**

The route checks found white on `--warning` at 3.34:1 — a token pairing, fixed
in `colors.css` and now guarded by `contrast.test.ts`.

The dark-mode check then found two more that **no token test can see**, because
neither is a token pairing at all:

| Element                            | Measured | Cause        |
| ---------------------------------- | -------- | ------------ |
| `RolesSection` paragraphs          | 4.39:1   | `opacity-90` |
| `RolesSection` "coming soon" badge | 3.85:1   | `opacity-70` |

An opacity modifier blends the element — foreground and background together —
toward whatever is behind it. The tokens involved all pass on their own; the
rendered result does not. `.claude/rules/tailwind.md` already warned that
low-opacity text is risky and asked for computed contrast to be verified.
Nothing verified it. Those three modifiers are gone; reach for a muted token
when something needs de-emphasising.

The first failure also exposed a gap in `contrast.test.ts` itself: it paired
`muted-foreground` only with `muted`, when its commonest use by far is on
`background` — secondary copy, captions, help text. Both that and `card` are
now checked.

### Landing's E2E suite had never run

Adding the spec surfaced this. `apps/landing` has had a `playwright.config.ts`
and `navbar-auth-state.spec.ts` all along, but the CI job maps pnpm filter
names to `scripts/e2e.mjs --app` values, and there was no `landing` case — so
it hit the `*)` branch and printed "No E2E suite for landing, skipping."
`e2e.mjs` did not accept `landing` either.

Both now do. If you add a Playwright config to an app, add it in **both**
places or the suite is silently never run.

### A naming hazard, now removed

`Label` in `packages/ui` was a **status badge that rendered a `<span>`**, not a
form label. The name collided with the shadcn convention, where `label.tsx`
_is_ the form label — so anyone importing `Label` to label an input would
silently get no association at all, which is the exact defect the `label` axe
rule exists to catch. That is how it was found: the first draft of the
accessibility suite assumed `Label` was a form label, and axe failed.

It is now `StatusLabel` in `StatusLabel.tsx`. Nothing imported it, so the
rename cost nothing, and it frees `label.tsx` for a real form label — there
isn't one in this package yet, which is worth knowing before building a form
against `ui`. A test pins the shape so the trap cannot come back.

---

## The PR Title check could not see a corrected title

`pr-checks.yml` ran on `[opened, synchronize, reopened]`. `edited` -- the event
GitHub fires when a title, body or base branch changes -- was missing.

So the check that exists specifically to police the PR title validated it once,
at open, and a corrected title could never clear the failure. The only way
through was to push an unrelated commit. `Branch Target` had the same problem
when a PR was retargeted.

Found by hitting it: a title three characters over the 80-character subject
limit stayed red through two corrections, because no run was triggered by
either.

`edited` is now in the trigger list. `changes`, `security` and `summary` opt
out of it, so fixing a typo does not re-run an audit or rewrite the summary
comment.

---

## The timing rules: the rule that makes a wait removable

`no-networkidle` (117) and `no-wait-for-timeout` (93) are being driven down per
app rather than in bulk, for the reason recorded above: the failure mode is
intermittent, and one green pipeline does not disprove it.

`admin` is done — 29 sites to 6. What made it safe is a single distinction,
and it is not "does an assertion follow":

**A wait is redundant only before a _positive_ assertion.** `expect(x)
.toBeVisible()` retries until the thing appears, so whatever the wait was
buying, the assertion buys again.

**A wait before a _negative_ assertion is load-bearing.**
`expect(x).toBeHidden()`, `not.toContain`, `toHaveCount(0)` all pass when the
page has not rendered yet. Remove the settle window and the test does not
become flaky — it becomes a **false pass**, which is worse, because nothing
ever goes red to tell you.

The first pass over `admin` missed this and removed the wait in front of five
negative assertions. The diff was re-read, reverted, and redone with the check
built into the transform. The six waits that remain are annotated in place with
why.

CI then caught a second half of the rule that the first version missed, and
it is the more subtle one.

**The assertion has to _retry_, not merely be positive.**
`expect(url.searchParams.get("status")).toBe("approved")` is a positive
assertion, but it reads `page.url()` once. It never retries. Two admin filter
tests are debounced, so removing the sleep in front of a one-shot read raced
the update and they failed — exactly the intermittent failure this ratchet is
being paced to avoid, surfaced by doing one app at a time.

The fix was not to put the sleep back. `await expect(page).toHaveURL(...)`
retries, so the wait stays gone and the assertion is robust on top. Four
one-shot URL reads in that file are now retrying assertions.

So the full rule is: **a wait is redundant only in front of a positive,
retrying assertion.** A Playwright web-first matcher (`toBeVisible`,
`toHaveURL`, `toHaveText`) retries. A plain `expect()` over a value you already
read does not.

Apply that to `payments` (31) and `auth` (149).

---

## Found by arming a gate: landing throws on load

Making `smoke-all-apps` able to fail immediately turned up a real defect.
`landing` throws **React error #418** on load — the server-rendered text did
not match the client's, so React discards the server HTML and re-renders. It
reproduced across all three CI attempts.

It is not new. The old version of that test collected page errors and
`console.log`ged them, so this had been happening for as long as anyone had
been not-reading the logs.

It is not fixed yet, and the reason is worth stating: the cause is not proven.
The obvious suspect is `useCurrentUserPermissions`, whose `useState`
initializer prefers `readPermCache()` — a browser cookie the server cannot
read — over the `initialGrantedKeys` the server rendered with. That is a
textbook hydration mismatch. But `landing`'s layout passes
`initialGrantedKeys` exactly as the other apps do, and only `landing` fails,
so that explanation is incomplete. Confirming it needs the app running
locally.

Meanwhile the other six apps **are** checked, and `landing` has a `test.fixme`
that names the error. `fixme` reports as a known failure rather than a skip,
so it stays visible in every run instead of turning green by omission. Delete
it, and the `KNOWN_FAILING_APP` exclusion, with the fix.
