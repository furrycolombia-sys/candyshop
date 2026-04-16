-- Set passwords for Supabase roles created by migrate.sh.
-- Runs after migrate.sh via the zz-roles.sql mount.
-- Only targets roles that migrate.sh guarantees exist on a fresh init.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
