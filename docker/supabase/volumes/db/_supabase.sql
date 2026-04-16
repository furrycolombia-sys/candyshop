-- Create _supabase database for analytics (Logflare).
-- Runs after migrate.sh via zy-supabase-db.sql mount.
CREATE DATABASE _supabase WITH OWNER supabase_admin;
