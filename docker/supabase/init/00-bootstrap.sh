#!/bin/bash
# This script runs before migrate.sh (alphabetically first).
# The supabase/postgres image handles all internal role/schema setup via migrate.sh.
# Nothing to do here — this file exists only as a placeholder.
echo "[bootstrap] Pre-migrate placeholder — supabase/postgres handles internal setup."
