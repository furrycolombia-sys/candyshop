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

Four rules remain staged as warnings with their counts recorded in
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
