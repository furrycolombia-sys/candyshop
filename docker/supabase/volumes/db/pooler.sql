-- Create _supavisor schema in _supabase database for Supavisor pooler.
-- Runs after zy-supabase-db.sql creates the _supabase database.
\c _supabase
CREATE SCHEMA IF NOT EXISTS _supavisor;
ALTER SCHEMA _supavisor OWNER TO supabase_admin;
\c postgres
