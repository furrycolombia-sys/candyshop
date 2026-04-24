# Telegram Notifications

> Reference for the Telegram bot used to route GitHub Actions alerts into the project supergroup.

---

## Bot & Group

| Variable             | Value             | Description                      |
| -------------------- | ----------------- | -------------------------------- |
| `TELEGRAM_BOT_TOKEN` | `8768616950:AAG…` | Bot token (stored in `.secrets`) |
| `TELEGRAM_CHAT_ID`   | `-1003953034526`  | Supergroup chat ID               |

The Telegram URL format for a thread is:
`https://t.me/c/{chat_id_without_minus}/{thread_id}`
e.g. `https://t.me/c/3953034526/4` → Reviews & Feedback

---

## Forum Topics (Threads)

| Variable                      | Thread ID | Topic Name             | Purpose                                     |
| ----------------------------- | --------- | ---------------------- | ------------------------------------------- |
| `TELEGRAM_CRITICAL_THREAD_ID` | `2`       | Critical Notifications | Deployment failures, health alerts, crashes |
| `TELEGRAM_REVIEWS_THREAD_ID`  | `4`       | Reviews & Feedback     | Bug issue reports, user feedback events     |
| `TELEGRAM_THREAD_ID`          | `6`       | Server Notifications   | General CI/CD info, route warm-up failures  |

---

## Workflows → Thread Mapping

| Workflow file                      | Event                      | Thread used                   |
| ---------------------------------- | -------------------------- | ----------------------------- |
| `notify-bug-issue.yml`             | GitHub issue labeled `bug` | `TELEGRAM_REVIEWS_THREAD_ID`  |
| `notify-deploy.yml` (if present)   | Deployment success/failure | `TELEGRAM_CRITICAL_THREAD_ID` |
| Route warm-up / JIT failure alerts | Scheduled health checks    | `TELEGRAM_THREAD_ID`          |

---

## Adding a New Thread

1. Create the forum topic in the Telegram supergroup.
2. Open the topic — the URL will show `https://t.me/c/{group_id}/{thread_id}`.
3. Add `TELEGRAM_<NAME>_THREAD_ID=<id>` to `.secrets`.
4. Add the matching `TELEGRAM_<NAME>_THREAD_ID: ${{ secrets.TELEGRAM_<NAME>_THREAD_ID }}` to `sync-secrets.yml` (env block **and** written file output).
5. Run `pnpm sync-secrets` to push the secret to GitHub.
6. Reference the variable in the workflow that needs it.

---

## Related

- `.secrets` — Local source of truth for all secrets
- `.github/workflows/sync-secrets.yml` — Packages secrets for syncing to GitHub
- `.github/workflows/notify-bug-issue.yml` — Bug issue → Reviews & Feedback
- [Git Safety](./git-safety.md) — Never commit real secret values
