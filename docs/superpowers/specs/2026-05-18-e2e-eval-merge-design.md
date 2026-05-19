# E2E Eval Skill Merge — Design Spec

**Date:** 2026-05-18
**Goal:** Consolidate `/run-e2e` into `/e2e-eval` and add three high-leverage improvements while doing it.

---

## Why

`/run-e2e` is a generic Playwright template skill that was never adapted to this monorepo. It uses `npm run test:e2e`, references `localhost:3000`, ignores `scripts/e2e.mjs`, and has no infrastructure awareness. It's effectively dead weight.

`/e2e-eval` is the real, project-aware skill: autonomous infra setup (Supabase, Docker, Cloudflare tunnel, dev server), flaky detection, auto-fix mode, and structured Markdown reports.

Maintaining both creates ambiguity ("which one do I run?") with no upside. Merging into one skill covers every E2E workflow — autonomous CI-style runs, interactive debugging, and replays of recent failures — under one entry point.

---

## Scope

Five concrete changes to `/e2e-eval`:

1. Add **`--ui`** — Playwright UI mode after infra setup
2. Add **`--debug <spec>`** — Playwright inspector after infra setup
3. Add **cached infra detection** as default Phase 2 behavior
4. Add **`--replay`** — re-run only the failures from the most recent report
5. Add **`--ci`** — match GitHub Actions runtime config

Plus cleanup: delete `/run-e2e` skill and all cross-references.

---

## 1. Interactive Modes: `--ui` and `--debug`

### `--ui`

```
/e2e-eval --app auth --ui
/e2e-eval --env staging --app admin --ui
```

**Behavior:**

- Run Phases 0–2 normally (env preflight, browser/Docker/tunnel checks, infrastructure start)
- After Phase 2, invoke: `node scripts/e2e.mjs --env {env} --app {app} -- --ui`
- Skip Phases 3–6 (no failure analysis, no fix, no report — user drives interactively)
- Exit cleanly when the Playwright UI process exits

**Requirements:**

- Must specify a single app via `--app`. `--app all` is rejected (UI mode runs against one project at a time).
- Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ci`.

### `--debug <spec>`

```
/e2e-eval --app admin --debug apps/admin/e2e/reports.spec.ts
```

**Behavior:**

- Run Phases 0–2 normally
- After Phase 2, invoke: `node scripts/e2e.mjs --env {env} --app {app} -- --debug {spec}`
- Skip Phases 3–6
- Exit when Playwright inspector exits

**Requirements:**

- Spec path argument is required
- Must specify a single app via `--app`
- Mutually exclusive with `--fix`, `--retries`, `--replay`, `--ui`, `--ci`

---

## 2. Cached Infra Detection (default Phase 2 behavior)

Currently Phase 2 always starts services from scratch (with manual `--skip-infra` opt-out). Switch to detect-then-start: probe each service before starting, only start the ones that aren't already up.

### Dev environment

| Service           | Probe                                        | If responding                                                 |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Supabase          | TCP probe on `SUPABASE_PORT` from `.env.dev` | Skip Supabase start; log "Supabase already running on port N" |
| Dev server (apps) | n/a                                          | **Always kill + restart** (preserves Turbopack-staleness fix) |

The "always kill and restart dev server" policy is preserved as-is. Cached detection in dev applies only to Supabase, because the existing skill explicitly documents that a long-running dev server can accumulate Turbopack module state and cause silent SSR failures. Caching it would re-introduce that footgun.

### Staging environment

| Service           | Probe                                         | If responding            |
| ----------------- | --------------------------------------------- | ------------------------ |
| Supabase          | TCP probe on port 64321                       | Skip Supabase start      |
| Docker container  | HTTP probe on `http://localhost:7542/`        | Skip `docker:build --up` |
| Cloudflare tunnel | HTTPS probe on tunnel URL from `.env.staging` | Skip tunnel start        |

All three independently cached. If a probe fails, that service is started normally.

### Report format change

Infrastructure table in the Markdown report gains a "Reused" status:

```
| Supabase            | ♻️ Reused (already running) / ✅ Started / ⏭️ Skipped |
| Docker container    | ♻️ Reused / ✅ Built+started / ⏭️ N/A (dev)         |
| Cloudflare tunnel   | ♻️ Reused / ✅ Active (staging) / ⏭️ N/A (dev)      |
```

`--skip-infra` remains as the explicit override (don't even probe; assume everything is up). `--clean` continues to force a full Supabase reset regardless of probe result.

---

## 3. `--replay`

Re-run only the failures from the most recent `.ai-context/reports/e2e-eval-*.md`.

```
/e2e-eval --replay
/e2e-eval --replay --fix     # replay failures AND apply --fix
```

**Behavior:**

1. Find newest report by filename timestamp (`e2e-eval-{YYYY-MM-DDTHH-MM-SS}.md`)
2. If no report file exists at all → exit with: `No previous reports found in .ai-context/reports/`
3. Parse the "Failed Tests" section; extract `{app}` (from the spec file path: `apps/{app}/e2e/...`) and `{spec_file}:{line}` per failure
4. If no failures in the newest report → exit with: `No failures to replay (last report: {path})`
5. Group failures by app
6. Run Phases 0–2 normally (with cached detection)
7. For each app group, invoke: `node scripts/e2e.mjs --env {env} --app {app} -- {spec1}:{line1} {spec2}:{line2}`
8. Continue with Phases 4–6 (analysis, fix if `--fix`, report)
9. The new report references the replayed-from report at the top via a `**Replay of:** {path}` line

**Edge cases:**

- Test file no longer exists at the referenced path → log and skip that one specific test, continue with the rest
- Newest report mixes apps → group and run sequentially (auth before admin, matching existing `--app all` order)
- Replay run produces new failures not in the source report → they appear in the new report normally

**Mutually exclusive with:** `--ui`, `--debug`, `--files`, `--ci`

---

## 4. `--ci`

Match the GitHub Actions runtime config to reproduce CI-only failures locally.

```
/e2e-eval --ci
/e2e-eval --ci --app admin
```

**Behavior:**

- Forces Playwright `workers=1` (no parallelism)
- Forces Playwright `retries=2` (matches CI)
- Forces headless (rejects `--headed` with an error)
- Disables the skill's flaky-detection retry loop (Playwright's `retries=2` covers it instead). Effectively this means `--retries` from the skill is ignored when `--ci` is set.

**Implementation:** pass through to `e2e.mjs` as `-- --workers=1 --retries=2`.

**Mutually exclusive with:** `--headed`, `--ui`, `--debug`, `--replay`

---

## 5. Cleanup

**Delete:**

- `.claude/skills/run-e2e/SKILL.md`
- `.claude/skills/run-e2e/` directory after the file is removed

**Cross-reference updates** (replace `/run-e2e` with `/e2e-eval`, fix the link target):

| File                                           | Line | Change                                                        |
| ---------------------------------------------- | ---- | ------------------------------------------------------------- |
| `.claude/rules/e2e-selectors.md`               | 341  | `Run E2E Skill` link → `E2E Eval Skill`, point at `e2e-eval/` |
| `.claude/rules/testing.md`                     | 791  | Same                                                          |
| `.claude/skills/capture-evidences/SKILL.md`    | 312  | Table entry `/run-e2e` → `/e2e-eval`                          |
| `.claude/skills/run-tests/SKILL.md`            | 88   | "For E2E specific files, see..." link target                  |
| `.claude/skills/run-tests/SKILL.md`            | 317  | Related-section link                                          |
| `.claude/skills/verify-code/SKILL.md`          | 307  | Related-section link                                          |
| `.claude/skills/e2e-eval/SKILL.md`             | 622  | Remove the self-link to deleted `/run-e2e`                    |
| `.claude/skills/generate-setup-guide/SKILL.md` | 399  | Setup-guide command list                                      |
| `.claude/skills/start-task/SKILL.md`           | 88   | Phase table entry                                             |
| `.claude/skills/start-task/SKILL.md`           | 838  | Final checklist item                                          |
| `.claude/skills/start-task/SKILL.md`           | 1090 | Related-skills table                                          |

`CLAUDE.md` does not reference `/run-e2e` — no change needed there.

Historical plan `docs/superpowers/plans/2026-05-14-start-task-brainstorming-integration.md` references `/run-e2e` — left untouched (historical artifact).

---

## Out of scope (future follow-up)

- `--smoke` flag (requires a `@smoke` test-tagging convention to be added first)
- `--watch` mode (Playwright doesn't natively support it; would need a custom file watcher around `e2e.mjs`)
- `--cleanup-only` (tear down infra without running tests)
- Diff-against-last-run (requires JSON output of results; current report is Markdown only)

---

## Implementation impact

| File                               | Change                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/skills/e2e-eval/SKILL.md` | Add `--ui`, `--debug`, `--replay`, `--ci` flags. Add cached-infra detection to Phase 2. Add report-format updates. Add mutex docs. Remove the "Related → /run-e2e" link.                          |
| `.claude/skills/run-e2e/SKILL.md`  | Delete                                                                                                                                                                                            |
| `.claude/skills/run-e2e/`          | Remove directory                                                                                                                                                                                  |
| 9 cross-referencing files          | See table above                                                                                                                                                                                   |
| `scripts/e2e.mjs`                  | Verify `--`-forward of `--ui`, `--debug`, `--workers`, `--retries` works correctly. Confirm interactive-mode stdio is wired through (no buffering). If broken, fix it as a 1–2 line runner tweak. |

---

## Testing

The skill itself isn't unit-testable, but each new flag gets a spot-check during implementation:

1. **`--ui` smoke:** `/e2e-eval --env dev --app auth --ui` → Playwright UI opens; user closes; runner exits 0
2. **`--debug` smoke:** `/e2e-eval --env dev --app admin --debug apps/admin/e2e/reports.spec.ts` → inspector opens
3. **Cached detection (dev):** Run twice in a row; second run reports `♻️ Reused` for Supabase
4. **Cached detection (staging):** Same; second run reports `♻️ Reused` for Supabase, Docker, tunnel
5. **`--replay` (clean):** Run a known-failing spec to produce a report, then `/e2e-eval --replay` → only that test runs
6. **`--replay --fix`:** Same as 5 but with `--fix`; fix applied, replay confirms green
7. **`--replay` (no prior report):** Fresh repo, no reports → exit message confirms
8. **`--replay` (no failures in last report):** Run all-green suite first, then `--replay` → exit message confirms
9. **`--ci`:** `/e2e-eval --ci --app admin --files apps/admin/e2e/reports.spec.ts` → e2e.mjs invoked with `--workers=1 --retries=2`
10. **Mutex enforcement:** `/e2e-eval --ui --fix` → rejected with clear error
11. **Cleanup verification:** `grep -rn "/run-e2e\|run-e2e/SKILL" .claude/` returns nothing (except in this spec file itself)
