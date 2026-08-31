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

Two more rules were driven to zero and promoted on 2026-08-30:
`no-useless-not` (19 reported, 25 sites) and
`consistent-spacing-between-blocks` (1).

Promoting them needed an explicit `"error"`. The recommended set ships both as
warnings, so removing them from the staged list left them as warnings and the
promotion silently did nothing -- caught only by planting a violation and
watching it fail to error. That is the whole reason this document asks you to
prove a gate can fail.

The remaining rules are staged as warnings with their counts recorded in
`eslint.config.mjs`, to be driven to zero and promoted one at a time. Do not
run `eslint --fix` blindly over them: `prefer-web-first-assertions` rewrote
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
