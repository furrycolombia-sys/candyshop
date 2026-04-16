-- Create _analytics schema in _supabase database for Logflare.
-- Runs after zy-supabase-db.sql creates the _supabase database.
\c _supabase
CREATE SCHEMA IF NOT EXISTS _analytics;
ALTER SCHEMA _analytics OWNER TO supabase_admin;
\c postgres
