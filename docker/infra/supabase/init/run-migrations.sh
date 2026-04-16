#!/bin/sh
# =============================================================================
# App migrations + seed runner
# =============================================================================
# Runs as a one-shot container (db-migrations) after supabase-auth is healthy.
# Uses the postgres superuser so all migrations run with full privileges.
# =============================================================================

set -e

echo "[migrations] Waiting for DB to accept connections..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" 2>/dev/null; do
  sleep 1
done

echo "[migrations] Running app migrations..."
for f in /supabase/migrations/*.sql; do
  echo "[migrations]   Applying: $(basename "$f")"
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$f"
done

echo "[migrations] Running seed..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f /supabase/seed.sql

echo "[migrations] Done."
