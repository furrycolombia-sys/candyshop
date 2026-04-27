# Task Overview: GH-227

## Issue Details

| Field      | Value                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------- |
| **Issue**  | #227                                                                                               |
| **Title**  | chore(security): fix Semgrep findings — GH Actions injection, passphrase exposure, dependency CVEs |
| **Type**   | chore                                                                                              |
| **Labels** | chore, security                                                                                    |

## Description

Semgrep AppSec Platform scan + `pnpm audit` identified real security issues in GitHub Actions workflows and dependencies.

## Acceptance Criteria

- [ ] `sync-secrets.yml` passphrase uses `env:` variable (not CLI arg)
- [ ] `pr-freshness.yml` template vars assigned to `env:` before shell use
- [ ] `sandbox-release.yml` commit SHA uses `env:` variable
- [ ] GitHub Actions pinned to commit SHAs
- [ ] Next.js upgraded to `>=16.2.3`
- [ ] Vite upgraded to `>=7.3.2`
- [ ] All existing tests pass
- [ ] `pnpm audit` shows no HIGH/CRITICAL vulnerabilities
