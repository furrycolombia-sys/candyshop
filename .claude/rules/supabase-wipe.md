# Supabase Full Wipe & Re-Migration Procedure

> **Use this when the user asks for a "full wipe" of Supabase dev or prod.**

---

## Tokens and Projects

| Environment | Project ID             | PAT Variable                 | PAT Location |
| ----------- | ---------------------- | ---------------------------- | ------------ |
| Dev         | `dsczudkhoolxjaxjeqdf` | `DEV_SUPABASE_ACCESS_TOKEN`  | `.secrets`   |
| Prod        | `olafyajipvsltohagiah` | `PROD_SUPABASE_ACCESS_TOKEN` | `.secrets`   |

The PATs are Personal Access Tokens for the Supabase Management API. They are stored in `.secrets` under:

```
# ─── Supabase Management API (Personal Access Tokens) ───────────
DEV_SUPABASE_ACCESS_TOKEN=sbp_...
PROD_SUPABASE_ACCESS_TOKEN=sbp_...
```

> **Note:** Direct port 5432 (Postgres) connections are blocked on Supabase Cloud from outside AWS. All DB operations must go through the Management API REST endpoint.

---

## Step 1: Drop and Recreate the Public Schema

This wipes all tables, types, functions, policies, and triggers in the `public` schema.

```bash
TOKEN="<DEV_SUPABASE_ACCESS_TOKEN or PROD_SUPABASE_ACCESS_TOKEN>"
PROJECT="<dsczudkhoolxjaxjeqdf or olafyajipvsltohagiah>"

DROP_SQL="DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public; GRANT ALL ON SCHEMA public TO anon; GRANT ALL ON SCHEMA public TO authenticated; GRANT ALL ON SCHEMA public TO service_role;"

payload=$(python3 -c "import json; print(json.dumps({'query': '$DROP_SQL'}))")

curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT}/database/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload"
```

Expected response: `[]` with HTTP 201.

> **Note:** This does NOT delete auth users. The `auth` schema is managed by Supabase and not touched by this command. If you also need to delete auth users, use the Supabase REST API with the service role key to list and delete users via `DELETE /auth/v1/admin/users/{id}`.

---

## Step 2: Apply All Migrations

Run all 27 migration files in order using the Management API:

```bash
TOKEN="<DEV_SUPABASE_ACCESS_TOKEN or PROD_SUPABASE_ACCESS_TOKEN>"
PROJECT="<dsczudkhoolxjaxjeqdf or olafyajipvsltohagiah>"

run_migration() {
  local file="$1"
  local payload
  payload=$(python3 -c "import json,sys; print(json.dumps({'query':open(sys.argv[1]).read()}))" "$file")

  local tmpfile
  tmpfile=$(mktemp)
  local http_code
  http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" -X POST \
    "https://api.supabase.com/v1/projects/${PROJECT}/database/query" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload")

  local body
  body=$(cat "$tmpfile")
  rm -f "$tmpfile"

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "✅ [$http_code] $(basename $file)"
  else
    echo "❌ [$http_code] $(basename $file)"
    echo "   $body"
  fi
}

for f in supabase/migrations/*.sql; do
  run_migration "$f"
done
```

All 27 files in `supabase/migrations/` should return ✅.

---

## Known Issues and Fixes

### `audit.logged_actions` already exists (42P07)

Supabase Cloud provides a built-in `audit` schema with `logged_actions`. The migration `20260325400000_audit_system.sql` was updated to use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` so it is idempotent.

### Table filter for data-only wipe

If you only need to wipe data (not schema), use these filters per table type:

- Tables with UUID primary keys: `?created_at=gte.2000-01-01`
- `payment_settings` table: `?updated_at=gte.2000-01-01` (no `created_at` column)

---

## Auth Users Wipe (if needed)

```bash
SERVICE_KEY="<DEV_SUPABASE_SERVICE_ROLE_KEY or PROD_SUPABASE_SERVICE_ROLE_KEY>"
SUPABASE_URL="<DEV_SUPABASE_URL or PROD_SUPABASE_URL>"

# List all users
users=$(curl -s "${SUPABASE_URL}/auth/v1/admin/users?per_page=1000" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

# Delete each user
echo "$users" | python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
users = data.get('users', [])
for u in users:
    uid = u['id']
    subprocess.run(['curl', '-s', '-X', 'DELETE',
        '${SUPABASE_URL}/auth/v1/admin/users/' + uid,
        '-H', 'apikey: ${SERVICE_KEY}',
        '-H', 'Authorization: Bearer ${SERVICE_KEY}'])
    print(f'Deleted: {uid}')
"
```

---

## Verify Schema After Migration

```bash
TOKEN="<token>"
PROJECT="<project_id>"

CHECK_SQL="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
payload=$(python3 -c "import json,sys; print(json.dumps({'query': sys.argv[1]}))" "$CHECK_SQL")

curl -s -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT}/database/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload"
```

Expected tables after migration: `check_in_audit`, `check_ins`, `events`, `order_items`, `orders`, `payment_settings`, `permissions`, `product_entitlements`, `product_reviews`, `product_templates`, `products`, `resource_permissions`, `seller_admins`, `seller_payment_methods`, `ticket_transfers`, `user_permissions`, `user_profiles`.

---

## Related

- `.secrets` — PATs and service role keys
- `supabase/migrations/` — All 27 migration files
- [Git Safety](.claude/rules/git-safety.md) — Never commit secrets
