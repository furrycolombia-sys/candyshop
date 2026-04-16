-- Create _realtime schema for the Realtime service.
-- Runs after migrate.sh via zy-realtime.sql mount.
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
